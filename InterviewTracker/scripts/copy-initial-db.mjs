// Pre-build step: copies the local SQLite DB into public/ so it becomes a
// static asset in the deploy. The browser app loads it once (when IndexedDB
// is empty) to seed the user's initial state. Skips silently in CI/dev when
// no local DB exists.
import { copyFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";

const SRC = "data/interview-tracker.db";
const DEST = "public/initial-db.sqlite";

if (!existsSync(SRC)) {
  console.log(`[copy-initial-db] No ${SRC} found — skipping (fresh-deploy mode).`);
  process.exit(0);
}

await mkdir("public", { recursive: true });
await copyFile(SRC, DEST);
const s = await stat(DEST);
console.log(`[copy-initial-db] ${SRC} → ${DEST} (${(s.size / 1024).toFixed(0)} KB)`);
