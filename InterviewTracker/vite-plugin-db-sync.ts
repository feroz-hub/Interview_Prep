import { promises as fs } from "node:fs";
import path from "node:path";
import type { Connect, Plugin } from "vite";

// Dev-only middleware that mirrors the in-browser SQLite database to a real
// .db file on disk. The browser app calls these two endpoints:
//   GET  /__db/load  -> returns the current .db bytes (404 if missing)
//   POST /__db/save  -> body is the new .db bytes; written atomically
//
// The file lives at <project>/data/interview-tracker.db so it can be
// inspected with the sqlite3 CLI, committed to git if desired, and so the
// real database is the source of truth across reloads / browsers.
export function dbSyncPlugin(opts: { file?: string } = {}): Plugin {
  const dbPath = path.resolve(opts.file ?? "data/interview-tracker.db");

  async function ensureDir() {
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
  }

  function attach(server: { middlewares: Connect.Server }) {
    server.middlewares.use("/__db/load", async (req, res) => {
      if (req.method !== "GET") {
        res.statusCode = 405;
        res.end();
        return;
      }
      try {
        const data = await fs.readFile(dbPath);
        res.setHeader("Content-Type", "application/x-sqlite3");
        res.setHeader("Content-Length", String(data.byteLength));
        res.end(data);
      } catch (e: any) {
        if (e?.code === "ENOENT") {
          res.statusCode = 404;
          res.end();
        } else {
          res.statusCode = 500;
          res.end(String(e));
        }
      }
    });

    server.middlewares.use("/__db/save", async (req, res) => {
      if (req.method !== "POST") {
        res.statusCode = 405;
        res.end();
        return;
      }
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const buf = Buffer.concat(chunks);
        await ensureDir();
        // Atomic write: tmp file + rename so a crash mid-write can't corrupt.
        const tmp = dbPath + ".tmp";
        await fs.writeFile(tmp, buf);
        await fs.rename(tmp, dbPath);
        res.statusCode = 204;
        res.end();
      } catch (e: any) {
        res.statusCode = 500;
        res.end(String(e));
      }
    });
  }

  return {
    name: "db-sync",
    apply: "serve",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}
