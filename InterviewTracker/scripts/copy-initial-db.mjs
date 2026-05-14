// Pre-build step: copies the local SQLite DB into public/ so it becomes a
// static asset in the deploy. The browser app loads it once (when IndexedDB
// is empty) to seed the user's initial state.
//
// IMPORTANT: this script only copies the source DB if it's already at the
// current schema (v3, with the `track` column). If the source is older or
// broken, we keep whatever is already in public/initial-db.sqlite. That
// way a broken local DB never overwrites a good bundled snapshot.
import { copyFile, mkdir, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";

const SRC = "data/interview-tracker.db";
const DEST = "public/initial-db.sqlite";
const REQUIRED_VERSION = 3;

if (!existsSync(SRC)) {
  console.log(`[copy-initial-db] No ${SRC} found — keeping ${existsSync(DEST) ? DEST : "no bundled DB"}.`);
  process.exit(0);
}

// Inspect the source by reading just the SQLite header + walking for the
// 'meta' table value. Rather than pull in a sqlite3 dep, we look at the raw
// bytes for a few sanity markers. The byte pattern "schema_version" appears
// near a known offset; the value byte right after determines schema version.
async function isSourceCurrent(src) {
  const buf = readFileSync(src);
  const text = buf.toString("latin1");
  // Did we ever stamp version >= 3?
  const m = text.match(/schema_version[\s\S]{0,200}?(\d)/);
  const version = m ? Number(m[1]) : 0;
  // Does the questions table have a track column? Look for the literal column
  // name in the schema area (CREATE TABLE or ALTER TABLE).
  const hasTrack = /track[\s\x00-\x20]+TEXT/i.test(text);
  return { version, hasTrack, ok: version >= REQUIRED_VERSION && hasTrack };
}

const probe = await isSourceCurrent(SRC);
if (!probe.ok) {
  console.log(
    `[copy-initial-db] ${SRC} looks pre-v${REQUIRED_VERSION} ` +
      `(version=${probe.version}, hasTrack=${probe.hasTrack}) — keeping existing ${DEST}.`
  );
  if (!existsSync(DEST)) {
    console.warn(`[copy-initial-db] WARNING: no ${DEST} exists either. ` +
      `Production first-visit will start from an empty DB.`);
  }
  process.exit(0);
}

await mkdir("public", { recursive: true });
await copyFile(SRC, DEST);
const s = await stat(DEST);
console.log(`[copy-initial-db] ${SRC} → ${DEST} (${(s.size / 1024).toFixed(0)} KB)`);
