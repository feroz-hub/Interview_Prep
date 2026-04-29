// SQLite via sql.js (WebAssembly), persisted to IndexedDB.
// The full DB is held in memory and re-serialized to IndexedDB on writes (debounced).
// Users can also export/import the actual .sqlite file.

import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
// Vite turns this into a hashed, served URL.
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { QUESTIONS } from "../data/questions";
import type { ProgressEntry, Status, ActivityDay } from "../types";

const IDB_NAME = "interview-tracker-db";
const IDB_STORE = "sqlite";
const IDB_KEY = "main";
const SCHEMA_VERSION = 1;

// Dev-server endpoints provided by vite-plugin-db-sync. When the dev server is
// running, the real .db file on disk (data/interview-tracker.db) is the source
// of truth. In production builds these endpoints don't exist and the app falls
// back to IndexedDB only.
const DISK_LOAD_URL = "/__db/load";
const DISK_SAVE_URL = "/__db/save";

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
    diskSyncEnabled = true;
    const buf = await res.arrayBuffer();
    return buf.byteLength > 0 ? new Uint8Array(buf) : null;
  } catch {
    // No dev server (production build, or server down) — silently disable.
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
      part INTEGER NOT NULL DEFAULT 1
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
    CREATE INDEX IF NOT EXISTS idx_progress_next_review ON progress(next_review);
    CREATE INDEX IF NOT EXISTS idx_progress_status ON progress(status);
    CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);
  `);
  d.run(`INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)`, [
    String(SCHEMA_VERSION),
  ]);
}

function seedQuestions(d: Database) {
  // Idempotent insert (INSERT OR IGNORE means we never overwrite the seed)
  const stmt = d.prepare(
    `INSERT OR IGNORE INTO questions (id, topic, question, exp, part) VALUES (?, ?, ?, ?, ?)`
  );
  d.run("BEGIN");
  for (const q of QUESTIONS) {
    stmt.run([q.id, q.topic, q.question, q.exp, q.part]);
  }
  d.run("COMMIT");
  stmt.free();
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

  initPromise = (async () => {
    if (!SQL) SQL = await initSqlJs({ locateFile: () => wasmUrl });

    // Disk file (dev) wins over IndexedDB so the on-disk .db is the source of
    // truth across browsers / incognito / cleared storage.
    const fromDisk = await loadFromDisk();
    const existing = fromDisk ?? (await loadBinary());

    if (existing && existing.byteLength > 0) {
      _db = new SQL.Database(existing);
      createSchema(_db);
      seedQuestions(_db);
    } else {
      _db = new SQL.Database();
      createSchema(_db);
      seedQuestions(_db);
      migrateLocalStorage(_db);
    }
    await persistNow();
    return _db;
  })();

  return initPromise;
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
  seedQuestions(_db);
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
        last_reviewed, next_review, review_count, correct_count, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
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
       updated_at     = excluded.updated_at`,
    [
      id, entry.status, entry.notes, entry.ease, entry.interval, entry.repetitions,
      entry.lastReviewed, entry.nextReview, entry.reviewCount, entry.correctCount,
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
  const tables = ["questions", "progress", "activity", "achievements"].map((t) => {
    const r = queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM ${t}`);
    return { name: t, rows: r?.c ?? 0 };
  });
  return { sizeBytes: data.byteLength, tables };
}
