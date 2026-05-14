// SQLite via sql.js (WebAssembly), persisted to IndexedDB.
// The full DB is held in memory and re-serialized to IndexedDB on writes (debounced).
// Users can also export/import the actual .sqlite file.

import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
// Vite turns this into a hashed, served URL.
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { QUESTIONS } from "../data/questions";
// Pentest set is 271 KB. Lazy-import so it lives in a separate chunk that
// is only fetched the first time we actually seed it.
import { SEED_COURSES } from "../data/courses";
const PENTEST_TARGET = 500;
import type {
  ProgressEntry,
  Status,
  ActivityDay,
  Course,
  CourseSection,
  CourseTopic,
  CourseSession,
  CourseStatus,
  TopicStatus,
  UdemyAccount,
  Track,
  Badge,
  XpEvent,
  InterviewDate,
} from "../types";

const IDB_NAME = "interview-tracker-db";
const IDB_STORE = "sqlite";
const IDB_KEY = "main";
// v3: add `track`, `chapter`, `answer` to questions; `confidence` to progress;
//     new tables xp_log, badges, interview_dates.
const SCHEMA_VERSION = 3;

// Dev-server endpoints provided by vite-plugin-db-sync. When the dev server is
// running, the real .db file on disk (data/interview-tracker.db) is the source
// of truth. In production builds these endpoints don't exist; we then try the
// static initial-db.sqlite asset (baked at build time) and finally fall back
// to a fresh empty DB.
const DISK_LOAD_URL = "/__db/load";
const DISK_SAVE_URL = "/__db/save";
const INITIAL_DB_URL = "/initial-db.sqlite";

let SQL: SqlJsStatic | null = null;
let _db: Database | null = null;
let saveTimer: number | null = null;
let initPromise: Promise<Database> | null = null;
let diskSyncEnabled = false;

// ---------- IndexedDB helpers ----------
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadBinary(): Promise<Uint8Array | null> {
  const idb = await openIDB();
  return new Promise((resolve) => {
    const tx = idb.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    req.onsuccess = () => resolve((req.result as Uint8Array | undefined) ?? null);
    req.onerror = () => resolve(null);
  });
}

async function saveBinary(data: Uint8Array): Promise<void> {
  const idb = await openIDB();
  return new Promise((resolve) => {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(data, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

async function deleteBinary(): Promise<void> {
  const idb = await openIDB();
  return new Promise((resolve) => {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(IDB_KEY);
    tx.oncomplete = () => resolve();
  });
}

// ---------- Disk-file sync (dev only) ----------
async function loadFromDisk(): Promise<Uint8Array | null> {
  try {
    const res = await fetch(DISK_LOAD_URL, { cache: "no-store" });
    if (res.status === 404) {
      // Endpoint exists but no file yet — disk sync is available, just empty.
      diskSyncEnabled = true;
      return null;
    }
    if (!res.ok) return null;
    // In production the SPA rewrite happily returns 200 + index.html for any
    // unknown path. The dev plugin returns application/x-sqlite3. Use the
    // content-type to tell the two apart so we never feed HTML to sql.js.
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("text/html")) return null;
    diskSyncEnabled = true;
    const buf = await res.arrayBuffer();
    return buf.byteLength > 0 ? new Uint8Array(buf) : null;
  } catch {
    // No dev server (production build, or server down) — silently disable.
    return null;
  }
}

// Production-only: fetch the bundled initial DB asset (copied into public/
// at build time from data/interview-tracker.db). Used to seed first-time
// visitors with the deploy-time progress snapshot.
async function loadInitialBundledDb(): Promise<Uint8Array | null> {
  try {
    const res = await fetch(INITIAL_DB_URL, { cache: "no-store" });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    // Vercel returns text/html for missing static assets via the SPA rewrite.
    // Guard against that so we don't load the index.html as SQLite.
    if (ct.includes("text/html")) return null;
    const buf = await res.arrayBuffer();
    return buf.byteLength > 0 ? new Uint8Array(buf) : null;
  } catch {
    return null;
  }
}

async function saveToDisk(data: Uint8Array): Promise<void> {
  if (!diskSyncEnabled) return;
  try {
    // Copy into a fresh ArrayBuffer so fetch gets a clean BodyInit.
    const buf = new ArrayBuffer(data.byteLength);
    new Uint8Array(buf).set(data);
    await fetch(DISK_SAVE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-sqlite3" },
      body: buf,
    });
  } catch (e) {
    console.warn("Disk sync failed:", e);
  }
}

// ---------- Schema + seed ----------
function createSchema(d: Database) {
  d.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY,
      topic TEXT NOT NULL,
      question TEXT NOT NULL,
      exp INTEGER NOT NULL DEFAULT 1,
      part INTEGER NOT NULL DEFAULT 1,
      track TEXT NOT NULL DEFAULT 'dotnet',
      chapter INTEGER,
      answer TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS progress (
      question_id INTEGER PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'new',
      notes TEXT NOT NULL DEFAULT '',
      ease REAL NOT NULL DEFAULT 2.5,
      interval INTEGER NOT NULL DEFAULT 0,
      repetitions INTEGER NOT NULL DEFAULT 0,
      last_reviewed TEXT,
      next_review TEXT,
      review_count INTEGER NOT NULL DEFAULT 0,
      correct_count INTEGER NOT NULL DEFAULT 0,
      confidence INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );
    CREATE TABLE IF NOT EXISTS activity (
      date TEXT PRIMARY KEY,
      reviews INTEGER NOT NULL DEFAULT 0,
      marked INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      unlocked_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS xp_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track TEXT NOT NULL,
      date TEXT NOT NULL,             -- ISO timestamp
      kind TEXT NOT NULL,
      amount INTEGER NOT NULL,
      question_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS badges (
      id TEXT NOT NULL,
      track TEXT NOT NULL DEFAULT 'all',
      icon TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (id, track)
    );
    CREATE TABLE IF NOT EXISTS interview_dates (
      track TEXT PRIMARY KEY,
      target_date TEXT NOT NULL,
      set_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_progress_next_review ON progress(next_review);
    CREATE INDEX IF NOT EXISTS idx_progress_status ON progress(status);
    CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);
    CREATE INDEX IF NOT EXISTS idx_questions_track ON questions(track);
    CREATE INDEX IF NOT EXISTS idx_xp_log_track_date ON xp_log(track, date);
  `);
  createCoursesSchema(d);
  // Only stamp the version on a fresh DB. Migrations update it for existing DBs.
  d.run(`INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', ?)`, [
    String(SCHEMA_VERSION),
  ]);
}

function createCoursesSchema(d: Database) {
  d.run(`
    CREATE TABLE IF NOT EXISTS udemy_accounts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      email        TEXT NOT NULL UNIQUE,
      display_name TEXT,
      color        TEXT NOT NULL DEFAULT '#7c8cff',
      is_primary   INTEGER NOT NULL DEFAULT 0,
      notes        TEXT NOT NULL DEFAULT '',
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS courses (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      title           TEXT NOT NULL,
      stream          TEXT NOT NULL,
      platform        TEXT NOT NULL DEFAULT 'Udemy',
      account_email   TEXT,
      url             TEXT,
      total_sections  INTEGER NOT NULL DEFAULT 0,
      total_lectures  INTEGER NOT NULL DEFAULT 0,
      total_minutes   INTEGER NOT NULL DEFAULT 0,
      progress_pct    REAL NOT NULL DEFAULT 0,
      status          TEXT NOT NULL DEFAULT 'not_started',
      priority        INTEGER NOT NULL DEFAULT 3,
      target_date     TEXT,
      started_at      TEXT,
      completed_at    TEXT,
      notes           TEXT NOT NULL DEFAULT '',
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS ux_courses_title ON courses(title);

    CREATE TABLE IF NOT EXISTS course_sections (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id       INTEGER NOT NULL,
      order_index     INTEGER NOT NULL,
      title           TEXT NOT NULL,
      total_lectures  INTEGER NOT NULL DEFAULT 0,
      total_minutes   INTEGER NOT NULL DEFAULT 0,
      progress_pct    REAL NOT NULL DEFAULT 0,
      status          TEXT NOT NULL DEFAULT 'not_started',
      notes           TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS course_topics (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id      INTEGER NOT NULL,
      order_index     INTEGER NOT NULL,
      title           TEXT NOT NULL,
      duration_min    INTEGER NOT NULL DEFAULT 0,
      status          TEXT NOT NULL DEFAULT 'not_started',
      watched_seconds INTEGER NOT NULL DEFAULT 0,
      rating          INTEGER,
      notes           TEXT NOT NULL DEFAULT '',
      completed_at    TEXT,
      FOREIGN KEY (section_id) REFERENCES course_sections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS course_sessions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id       INTEGER NOT NULL,
      topic_id        INTEGER,
      date            TEXT NOT NULL,
      minutes         INTEGER NOT NULL,
      notes           TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_courses_stream    ON courses(stream);
    CREATE INDEX IF NOT EXISTS idx_courses_status    ON courses(status);
    CREATE INDEX IF NOT EXISTS idx_courses_account   ON courses(account_email);
    CREATE INDEX IF NOT EXISTS idx_sections_course   ON course_sections(course_id);
    CREATE INDEX IF NOT EXISTS idx_topics_section    ON course_topics(section_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_course   ON course_sessions(course_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_date     ON course_sessions(date);
  `);
}

function getSchemaVersion(d: Database): number {
  const stmt = d.prepare(`SELECT value FROM meta WHERE key = 'schema_version'`);
  let v = 0;
  if (stmt.step()) {
    const row = stmt.getAsObject() as { value?: string };
    v = Number(row.value ?? 0) || 0;
  }
  stmt.free();
  return v;
}

// Idempotent v1 -> v2 migration. Safe to run repeatedly.
function migrateToV2(d: Database) {
  createCoursesSchema(d);
  d.run(`INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '2')`);
}

// Idempotent shape enforcement. Runs on every init regardless of the recorded
// schema_version — it only adds what's missing. This is the recovery path for
// DBs where the version got stamped but the column-add never actually ran
// (a pre-existing INSERT-OR-REPLACE bug shipped one such broken state).
function ensureSchemaShape(d: Database) {
  const cols = (table: string): string[] =>
    query<{ name: string }>(`PRAGMA table_info(${table})`).map((r) => r.name);

  const qcols = cols("questions");
  if (!qcols.includes("track")) {
    d.run(`ALTER TABLE questions ADD COLUMN track TEXT NOT NULL DEFAULT 'dotnet'`);
  }
  if (!qcols.includes("chapter")) {
    d.run(`ALTER TABLE questions ADD COLUMN chapter INTEGER`);
  }
  if (!qcols.includes("answer")) {
    d.run(`ALTER TABLE questions ADD COLUMN answer TEXT NOT NULL DEFAULT ''`);
  }

  const pcols = cols("progress");
  if (!pcols.includes("confidence")) {
    d.run(`ALTER TABLE progress ADD COLUMN confidence INTEGER NOT NULL DEFAULT 0`);
  }

  d.run(`
    CREATE TABLE IF NOT EXISTS xp_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track TEXT NOT NULL,
      date TEXT NOT NULL,
      kind TEXT NOT NULL,
      amount INTEGER NOT NULL,
      question_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS badges (
      id TEXT NOT NULL,
      track TEXT NOT NULL DEFAULT 'all',
      icon TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (id, track)
    );
    CREATE TABLE IF NOT EXISTS interview_dates (
      track TEXT PRIMARY KEY,
      target_date TEXT NOT NULL,
      set_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_questions_track    ON questions(track);
    CREATE INDEX IF NOT EXISTS idx_xp_log_track_date  ON xp_log(track, date);
  `);

  // Backfill: any pre-existing question without a track gets 'dotnet'.
  d.run(`UPDATE questions SET track = 'dotnet' WHERE track IS NULL OR track = ''`);
}

function runMigrations(d: Database) {
  // Always run idempotent shape enforcement so a broken/half-migrated DB self-heals.
  // The version-based blocks below are retained for any future *destructive* migrations
  // that should only run once (none for v2/v3, which are purely additive).
  ensureSchemaShape(d);
  const current = getSchemaVersion(d);
  if (current < 2) migrateToV2(d);
  if (current < 3) {
    d.run(`INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '3')`);
  }
}

interface SeedAccount {
  email: string;
  displayName: string;
  color: string;
  isPrimary: boolean;
}
const SEED_ACCOUNTS: SeedAccount[] = [
  { email: "bashaferoz66@gmail.com",         displayName: "Primary",     color: "#7c8cff", isPrimary: true  },
  { email: "bashaferoz027@gmail.com",        displayName: "Secondary",   color: "#34d399", isPrimary: false },
  { email: "ferozebasha2001@gmail.com",      displayName: "Personal",    color: "#f59e0b", isPrimary: false },
  { email: "info.firoseenterprises@gmail.com", displayName: "Enterprises", color: "#ef4444", isPrimary: false },
  { email: "feroze.learning@gmail.com",      displayName: "Learning",    color: "#a855f7", isPrimary: false },
];

function seedAccounts(d: Database) {
  const stmt = d.prepare(
    `INSERT OR IGNORE INTO udemy_accounts (email, display_name, color, is_primary)
     VALUES (?, ?, ?, ?)`
  );
  d.run("BEGIN");
  for (const a of SEED_ACCOUNTS) {
    stmt.run([a.email, a.displayName, a.color, a.isPrimary ? 1 : 0]);
  }
  d.run("COMMIT");
  stmt.free();
}

function seedCourses(d: Database) {
  const stmt = d.prepare(
    `INSERT OR IGNORE INTO courses
       (title, stream, platform, progress_pct, status, priority, account_email)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  d.run("BEGIN");
  for (const c of SEED_COURSES) {
    const status: CourseStatus =
      c.progressPct >= 100
        ? "completed"
        : c.progressPct > 0
        ? "in_progress"
        : "not_started";
    stmt.run([
      c.title,
      c.stream,
      c.platform ?? "Udemy",
      c.progressPct,
      status,
      3,
      c.accountEmail ?? null,
    ]);
  }
  d.run("COMMIT");
  stmt.free();
}

async function seedQuestions(d: Database): Promise<boolean> {
  // Fast-path: skip the entire INSERT loop if both tracks are already fully
  // populated. This avoids ~1030 WASM round-trips on every page load.
  const dotnetCount = queryOne<{ c: number }>(
    `SELECT COUNT(*) AS c FROM questions WHERE track = 'dotnet'`
  )?.c ?? 0;
  const pentestCount = queryOne<{ c: number }>(
    `SELECT COUNT(*) AS c FROM questions WHERE track = 'pentest'`
  )?.c ?? 0;

  const needsDotnet = dotnetCount < QUESTIONS.length;
  const needsPentest = pentestCount < PENTEST_TARGET;
  if (!needsDotnet && !needsPentest) return false;

  const stmt = d.prepare(
    `INSERT OR IGNORE INTO questions
       (id, topic, question, exp, part, track, chapter, answer)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  d.run("BEGIN");
  if (needsDotnet) {
    for (const q of QUESTIONS) {
      stmt.run([q.id, q.topic, q.question, q.exp, q.part, "dotnet", null, ""]);
    }
  }
  if (needsPentest) {
    // Lazy import: only fetch the 271KB seed file when we actually need it.
    // If the chunk fails to load (network, CDN cache, etc.), fall through to
    // a .NET-only state rather than hanging the entire app on init. A 10s
    // race-timeout prevents an indefinitely-pending fetch from blocking.
    try {
      const mod = await Promise.race([
        import("../data/pentestQuestions"),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("pentest chunk timeout")), 10_000)
        ),
      ]);
      for (const q of mod.PENTEST_QUESTIONS) {
        stmt.run([
          q.id,
          q.topic,
          q.question,
          q.exp,
          q.part,
          q.track ?? "pentest",
          q.chapter ?? null,
          q.answer ?? "",
        ]);
      }
    } catch (e) {
      console.error("Pentest seed skipped (chunk load failed):", e);
    }
  }
  d.run("COMMIT");
  stmt.free();
  return true;
}

// ---------- Migration from legacy localStorage ----------
function migrateLocalStorage(d: Database) {
  try {
    const raw = localStorage.getItem("interview-tracker:v1");
    if (raw) {
      const parsed = JSON.parse(raw) as {
        progress: Record<string, ProgressEntry>;
        activity: Record<string, ActivityDay>;
      };
      d.run("BEGIN");
      const ps = d.prepare(
        `INSERT OR REPLACE INTO progress
        (question_id, status, notes, ease, interval, repetitions,
         last_reviewed, next_review, review_count, correct_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const [id, p] of Object.entries(parsed.progress ?? {})) {
        ps.run([
          Number(id), p.status, p.notes ?? "", p.ease, p.interval, p.repetitions,
          p.lastReviewed, p.nextReview, p.reviewCount, p.correctCount,
        ]);
      }
      ps.free();
      const as = d.prepare(
        `INSERT OR REPLACE INTO activity (date, reviews, marked) VALUES (?, ?, ?)`
      );
      for (const [date, a] of Object.entries(parsed.activity ?? {})) {
        as.run([date, a.reviews, a.marked]);
      }
      as.free();
      d.run("COMMIT");
      // Don't delete the legacy key automatically — backup safety.
      // localStorage.removeItem("interview-tracker:v1");
    }

    const ach = localStorage.getItem("interview-tracker:achievements");
    if (ach) {
      const arr = JSON.parse(ach) as string[];
      const stmt = d.prepare(`INSERT OR IGNORE INTO achievements (id) VALUES (?)`);
      for (const id of arr) stmt.run([id]);
      stmt.free();
    }
  } catch (e) {
    console.warn("Legacy migration skipped:", e);
  }
}

// ---------- Public API ----------
export async function initDb(): Promise<Database> {
  if (_db) return _db;
  if (initPromise) return initPromise;

  // Master timeout so the LoadingScreen can never sit forever. If anything in
  // initDb takes longer than this, we reject and the App.tsx error UI shows.
  const INIT_TIMEOUT_MS = 20_000;

  initPromise = Promise.race([
    initDbInner(),
    new Promise<Database>((_, reject) =>
      setTimeout(
        () => reject(new Error(`DB init timed out after ${INIT_TIMEOUT_MS / 1000}s. Check Console + Network for the slow request.`)),
        INIT_TIMEOUT_MS
      )
    ),
  ]);

  return initPromise;
}

async function initDbInner(): Promise<Database> {
  return (async () => {
    if (!SQL) SQL = await initSqlJs({ locateFile: () => wasmUrl });

    // Source order:
    //  1. Dev: /__db/load (writes go back to disk via the vite plugin).
    //  2. Returning visitor: their IndexedDB snapshot.
    //  3. Production first-visit: /initial-db.sqlite static asset (deploy-time
    //     snapshot of the author's progress).
    //  4. Otherwise: brand-new empty DB.
    const fromDisk = await loadFromDisk();
    const fromIdb = fromDisk ? null : await loadBinary();
    const fromInitial =
      !fromDisk && !fromIdb ? await loadInitialBundledDb() : null;
    const existing = fromDisk ?? fromIdb ?? fromInitial;

    let mutated = false;
    // Try to open the inherited DB; if the bytes are corrupt or non-SQLite
    // (e.g. an HTML SPA-fallback we couldn't detect), fall back to fresh
    // instead of leaving the user stuck on the loader forever.
    let opened: Database | null = null;
    if (existing && existing.byteLength > 0) {
      try {
        opened = new SQL.Database(existing);
        // Sanity check that this is actually a SQLite file by hitting the
        // schema. If sql.js accepted bogus bytes, this will throw.
        opened.exec("SELECT name FROM sqlite_master LIMIT 1");
      } catch (e) {
        console.warn("Existing DB bytes not openable; starting fresh.", e);
        try { opened?.close(); } catch {}
        opened = null;
      }
    }

    if (opened) {
      _db = opened;
      createSchema(_db); // CREATE TABLE IF NOT EXISTS + INSERT OR IGNORE meta
      const vBefore = getSchemaVersion(_db);
      runMigrations(_db);
      const vAfter = getSchemaVersion(_db);
      const seedWrote = await seedQuestions(_db); // fast-paths when already-seeded
      seedAccounts(_db);
      seedCourses(_db);
      mutated = vAfter > vBefore || seedWrote;
    } else {
      _db = new SQL.Database();
      createSchema(_db);
      runMigrations(_db);
      await seedQuestions(_db);
      seedAccounts(_db);
      seedCourses(_db);
      migrateLocalStorage(_db);
      mutated = true; // fresh DB always needs to be written out
    }

    if (mutated) {
      // Schedule rather than await so the UI can render immediately while the
      // ~1MB IDB write happens in the background.
      setTimeout(() => { persistNow().catch((e) => console.error("init persist failed:", e)); }, 0);
    }
    return _db;
  })();
}

export function db(): Database {
  if (!_db) throw new Error("DB not initialized — call initDb() first");
  return _db;
}

async function persistNow(): Promise<void> {
  if (!_db) return;
  const data = _db.export();
  await saveBinary(data);
  await saveToDisk(data);
}

export function persistDebounced(delay = 350): void {
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    persistNow().catch((e) => console.error("Persist failed:", e));
  }, delay);
}

// Run a write statement and queue persistence.
export function run(sql: string, params: any[] = []): void {
  if (!_db) return;
  _db.run(sql, params);
  persistDebounced();
}

// Run multiple writes inside a transaction.
export function tx(fn: () => void): void {
  if (!_db) return;
  _db.run("BEGIN");
  try {
    fn();
    _db.run("COMMIT");
    persistDebounced();
  } catch (e) {
    _db.run("ROLLBACK");
    throw e;
  }
}

// Returns rows as objects.
export function query<T extends Record<string, any> = any>(
  sql: string,
  params: any[] = []
): T[] {
  if (!_db) return [];
  const stmt = _db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject() as T);
  stmt.free();
  return rows;
}

export function queryOne<T extends Record<string, any> = any>(
  sql: string,
  params: any[] = []
): T | null {
  const rows = query<T>(sql, params);
  return rows[0] ?? null;
}

// ---------- Export / import .sqlite file ----------
export function exportSqliteBlob(): Blob {
  if (!_db) throw new Error("DB not initialized");
  const data = _db.export();
  // Wrap into ArrayBuffer for Blob compatibility (some TS lib bundles complain)
  const buf = new ArrayBuffer(data.byteLength);
  new Uint8Array(buf).set(data);
  return new Blob([buf], { type: "application/x-sqlite3" });
}

export function downloadSqliteFile(filename = "interview-tracker.sqlite") {
  const blob = exportSqliteBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importSqliteFile(file: File): Promise<void> {
  if (!SQL) SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const buf = await file.arrayBuffer();
  const data = new Uint8Array(buf);
  if (_db) _db.close();
  _db = new SQL.Database(data);
  // Make sure schema is intact (in case importing an older DB)
  createSchema(_db);
  runMigrations(_db);
  await seedQuestions(_db);
  seedAccounts(_db);
  seedCourses(_db);
  await persistNow();
}

export async function resetDb(): Promise<void> {
  if (_db) {
    _db.close();
    _db = null;
  }
  initPromise = null;
  await deleteBinary();
  await initDb();
}

// ---------- High-level helpers ----------
export interface ProgressRow {
  question_id: number;
  status: Status;
  notes: string;
  ease: number;
  interval: number;
  repetitions: number;
  last_reviewed: string | null;
  next_review: string | null;
  review_count: number;
  correct_count: number;
  confidence?: number;
}

export function loadAllProgress(): Record<number, ProgressEntry> {
  const rows = query<ProgressRow>(`SELECT * FROM progress`);
  const out: Record<number, ProgressEntry> = {};
  for (const r of rows) {
    out[r.question_id] = {
      status: r.status,
      notes: r.notes,
      ease: r.ease,
      interval: r.interval,
      repetitions: r.repetitions,
      lastReviewed: r.last_reviewed,
      nextReview: r.next_review,
      reviewCount: r.review_count,
      correctCount: r.correct_count,
      confidence: ((r.confidence ?? 0) as ProgressEntry["confidence"]),
    };
  }
  return out;
}

export function loadAllActivity(): Record<string, ActivityDay> {
  const rows = query<ActivityDay>(`SELECT date, reviews, marked FROM activity`);
  const out: Record<string, ActivityDay> = {};
  for (const r of rows) out[r.date] = r;
  return out;
}

export function upsertProgress(id: number, entry: ProgressEntry): void {
  run(
    `INSERT INTO progress
       (question_id, status, notes, ease, interval, repetitions,
        last_reviewed, next_review, review_count, correct_count, confidence, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(question_id) DO UPDATE SET
       status         = excluded.status,
       notes          = excluded.notes,
       ease           = excluded.ease,
       interval       = excluded.interval,
       repetitions    = excluded.repetitions,
       last_reviewed  = excluded.last_reviewed,
       next_review    = excluded.next_review,
       review_count   = excluded.review_count,
       correct_count  = excluded.correct_count,
       confidence     = excluded.confidence,
       updated_at     = excluded.updated_at`,
    [
      id, entry.status, entry.notes, entry.ease, entry.interval, entry.repetitions,
      entry.lastReviewed, entry.nextReview, entry.reviewCount, entry.correctCount,
      entry.confidence ?? 0,
    ]
  );
}

export function bumpActivity(date: string, kind: "reviews" | "marked"): void {
  if (kind === "reviews") {
    run(
      `INSERT INTO activity (date, reviews, marked) VALUES (?, 1, 0)
       ON CONFLICT(date) DO UPDATE SET reviews = reviews + 1`,
      [date]
    );
  } else {
    run(
      `INSERT INTO activity (date, reviews, marked) VALUES (?, 0, 1)
       ON CONFLICT(date) DO UPDATE SET marked = marked + 1`,
      [date]
    );
  }
}

export function loadAchievements(): Set<string> {
  const rows = query<{ id: string }>(`SELECT id FROM achievements`);
  return new Set(rows.map((r) => r.id));
}

export function unlockAchievement(id: string): void {
  run(
    `INSERT OR IGNORE INTO achievements (id, unlocked_at) VALUES (?, datetime('now'))`,
    [id]
  );
}

export function clearAchievements(): void {
  run(`DELETE FROM achievements`);
}

export function dbStats(): { sizeBytes: number; tables: { name: string; rows: number }[] } {
  if (!_db) return { sizeBytes: 0, tables: [] };
  const data = _db.export();
  const tables = [
    "questions",
    "progress",
    "activity",
    "achievements",
    "xp_log",
    "badges",
    "interview_dates",
    "udemy_accounts",
    "courses",
    "course_sections",
    "course_topics",
    "course_sessions",
  ].map((t) => {
    const r = queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM ${t}`);
    return { name: t, rows: r?.c ?? 0 };
  });
  return { sizeBytes: data.byteLength, tables };
}

// ---------- Meta key-value helpers ----------
export function getMeta(key: string): string | null {
  const r = queryOne<{ value: string }>(`SELECT value FROM meta WHERE key = ?`, [key]);
  return r?.value ?? null;
}

export function setMeta(key: string, value: string): void {
  run(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

// ---------- Courses helpers ----------
interface CourseRow {
  id: number;
  title: string;
  stream: string;
  platform: string;
  account_email: string | null;
  url: string | null;
  total_sections: number;
  total_lectures: number;
  total_minutes: number;
  progress_pct: number;
  status: CourseStatus;
  priority: number;
  target_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

function rowToCourse(r: CourseRow): Course {
  return {
    id: r.id,
    title: r.title,
    stream: r.stream,
    platform: r.platform,
    accountEmail: r.account_email,
    url: r.url,
    totalSections: r.total_sections,
    totalLectures: r.total_lectures,
    totalMinutes: r.total_minutes,
    progressPct: r.progress_pct,
    status: r.status,
    priority: r.priority,
    targetDate: r.target_date,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function loadAllCourses(): Course[] {
  return query<CourseRow>(`SELECT * FROM courses ORDER BY updated_at DESC, id ASC`).map(rowToCourse);
}

export function loadCourse(id: number): Course | null {
  const r = queryOne<CourseRow>(`SELECT * FROM courses WHERE id = ?`, [id]);
  return r ? rowToCourse(r) : null;
}

interface SectionRow {
  id: number;
  course_id: number;
  order_index: number;
  title: string;
  total_lectures: number;
  total_minutes: number;
  progress_pct: number;
  status: CourseStatus;
  notes: string;
}

function rowToSection(r: SectionRow): CourseSection {
  return {
    id: r.id,
    courseId: r.course_id,
    orderIndex: r.order_index,
    title: r.title,
    totalLectures: r.total_lectures,
    totalMinutes: r.total_minutes,
    progressPct: r.progress_pct,
    status: r.status,
    notes: r.notes,
  };
}

export function loadSections(courseId: number): CourseSection[] {
  return query<SectionRow>(
    `SELECT * FROM course_sections WHERE course_id = ? ORDER BY order_index ASC, id ASC`,
    [courseId]
  ).map(rowToSection);
}

interface TopicRow {
  id: number;
  section_id: number;
  order_index: number;
  title: string;
  duration_min: number;
  status: TopicStatus;
  watched_seconds: number;
  rating: number | null;
  notes: string;
  completed_at: string | null;
}

function rowToTopic(r: TopicRow): CourseTopic {
  return {
    id: r.id,
    sectionId: r.section_id,
    orderIndex: r.order_index,
    title: r.title,
    durationMin: r.duration_min,
    status: r.status,
    watchedSeconds: r.watched_seconds,
    rating: r.rating,
    notes: r.notes,
    completedAt: r.completed_at,
  };
}

export function loadTopics(sectionId: number): CourseTopic[] {
  return query<TopicRow>(
    `SELECT * FROM course_topics WHERE section_id = ? ORDER BY order_index ASC, id ASC`,
    [sectionId]
  ).map(rowToTopic);
}

export function loadAllTopicsForCourse(courseId: number): CourseTopic[] {
  return query<TopicRow>(
    `SELECT t.* FROM course_topics t
       JOIN course_sections s ON s.id = t.section_id
      WHERE s.course_id = ?
      ORDER BY s.order_index ASC, t.order_index ASC`,
    [courseId]
  ).map(rowToTopic);
}

interface SessionRow {
  id: number;
  course_id: number;
  topic_id: number | null;
  date: string;
  minutes: number;
  notes: string;
}

function rowToSession(r: SessionRow): CourseSession {
  return {
    id: r.id,
    courseId: r.course_id,
    topicId: r.topic_id,
    date: r.date,
    minutes: r.minutes,
    notes: r.notes,
  };
}

export function loadSessionsForCourse(courseId: number): CourseSession[] {
  return query<SessionRow>(
    `SELECT * FROM course_sessions WHERE course_id = ? ORDER BY date DESC, id DESC`,
    [courseId]
  ).map(rowToSession);
}

export function loadAllSessions(): CourseSession[] {
  return query<SessionRow>(
    `SELECT * FROM course_sessions ORDER BY date DESC, id DESC`
  ).map(rowToSession);
}

// ---------- Udemy accounts ----------
interface UdemyAccountRow {
  id: number;
  email: string;
  display_name: string | null;
  color: string;
  is_primary: number;
  notes: string;
}

function rowToAccount(r: UdemyAccountRow): UdemyAccount {
  return {
    id: r.id,
    email: r.email,
    displayName: r.display_name,
    color: r.color,
    isPrimary: !!r.is_primary,
    notes: r.notes,
  };
}

export function loadAllAccounts(): UdemyAccount[] {
  return query<UdemyAccountRow>(
    `SELECT * FROM udemy_accounts ORDER BY is_primary DESC, email ASC`
  ).map(rowToAccount);
}

// ---------- XP / Badges / Interview-date helpers ----------
interface XpRow {
  id: number;
  track: Track;
  date: string;
  kind: string;
  amount: number;
  question_id: number | null;
}

export function logXp(track: Track, kind: string, amount: number, questionId: number | null = null): void {
  run(
    `INSERT INTO xp_log (track, date, kind, amount, question_id) VALUES (?, ?, ?, ?, ?)`,
    [track, new Date().toISOString(), kind, amount, questionId]
  );
}

export function totalXpForTrack(track: Track): number {
  const r = queryOne<{ s: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS s FROM xp_log WHERE track = ?`,
    [track]
  );
  return r?.s ?? 0;
}

export function loadXpEvents(track: Track, limit = 200): XpEvent[] {
  return query<XpRow>(
    `SELECT * FROM xp_log WHERE track = ? ORDER BY id DESC LIMIT ?`,
    [track, limit]
  ).map((r) => ({
    id: r.id,
    track: r.track,
    date: r.date,
    kind: r.kind,
    amount: r.amount,
    questionId: r.question_id,
  }));
}

interface BadgeRow {
  id: string;
  track: Track;
  icon: string;
  title: string;
  body: string;
  unlocked_at: string;
}

export function loadBadges(track?: Track): Badge[] {
  const rows = track
    ? query<BadgeRow>(
        `SELECT * FROM badges WHERE track = ? OR track = 'all' ORDER BY unlocked_at DESC`,
        [track]
      )
    : query<BadgeRow>(`SELECT * FROM badges ORDER BY unlocked_at DESC`);
  return rows.map((r) => ({
    id: r.id,
    track: r.track,
    icon: r.icon,
    title: r.title,
    body: r.body,
    unlockedAt: r.unlocked_at,
  }));
}

export function unlockBadge(b: Omit<Badge, "unlockedAt">): boolean {
  // Returns true if this is a fresh unlock.
  const existing = queryOne<{ c: number }>(
    `SELECT COUNT(*) AS c FROM badges WHERE id = ? AND track = ?`,
    [b.id, b.track]
  );
  if ((existing?.c ?? 0) > 0) return false;
  run(
    `INSERT OR IGNORE INTO badges (id, track, icon, title, body) VALUES (?, ?, ?, ?, ?)`,
    [b.id, b.track, b.icon, b.title, b.body]
  );
  return true;
}

export function getInterviewDate(track: Track): InterviewDate | null {
  const r = queryOne<{ track: Track; target_date: string; set_at: string }>(
    `SELECT * FROM interview_dates WHERE track = ?`,
    [track]
  );
  return r ? { track: r.track, date: r.target_date, setAt: r.set_at } : null;
}

export function setInterviewDate(track: Track, date: string | null): void {
  if (!date) {
    run(`DELETE FROM interview_dates WHERE track = ?`, [track]);
    return;
  }
  run(
    `INSERT INTO interview_dates (track, target_date, set_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(track) DO UPDATE SET target_date = excluded.target_date, set_at = excluded.set_at`,
    [track, date]
  );
}
