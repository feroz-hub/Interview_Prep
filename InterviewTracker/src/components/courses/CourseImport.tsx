import { useMemo, useRef, useState } from "react";
import Modal from "./Modal";
import type { Course, CourseStatus, UdemyAccount } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (rows: Array<Partial<Course> & { title: string; stream: string }>) => void;
  accounts: UdemyAccount[];
  onAddAccount?: (email: string) => void;
}

interface ParseResult {
  rows: Array<Partial<Course> & { title: string; stream: string; accountEmail: string | null }>;
  errors: string[];
}

const REQUIRED = ["title", "stream"];

function deriveStatus(pct: number): CourseStatus {
  if (pct >= 100) return "completed";
  if (pct > 0) return "in_progress";
  return "not_started";
}

function parseCsv(text: string): ParseResult {
  const out: ParseResult = { rows: [], errors: [] };
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return out;
  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  for (const req of REQUIRED) {
    if (!header.includes(req)) {
      out.errors.push(`Missing required column: ${req}`);
    }
  }
  if (out.errors.length) return out;
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    header.forEach((h, j) => (row[h] = (cols[j] ?? "").trim()));
    if (!row.title || !row.stream) {
      out.errors.push(`Line ${i + 1}: missing title or stream`);
      continue;
    }
    const pct = Number(row.progress_pct) || 0;
    out.rows.push({
      title: row.title,
      stream: row.stream,
      platform: row.platform || "Udemy",
      url: row.url || null,
      accountEmail: row.account_email || null,
      totalSections: Number(row.total_sections) || 0,
      totalLectures: Number(row.total_lectures) || 0,
      totalMinutes: Number(row.total_minutes) || 0,
      progressPct: pct,
      status: deriveStatus(pct),
      priority: Number(row.priority) || 3,
      targetDate: row.target_date || null,
    });
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseJson(text: string): ParseResult {
  const out: ParseResult = { rows: [], errors: [] };
  try {
    const data: unknown = JSON.parse(text);
    if (!Array.isArray(data)) {
      out.errors.push("JSON must be an array of course objects.");
      return out;
    }
    for (let i = 0; i < data.length; i++) {
      const r = data[i] as Record<string, unknown>;
      if (typeof r?.title !== "string" || typeof r?.stream !== "string") {
        out.errors.push(`Row ${i + 1}: missing title or stream`);
        continue;
      }
      const pct = Number(r.progressPct ?? r.progress_pct ?? 0);
      out.rows.push({
        title: r.title,
        stream: r.stream,
        platform: (r.platform as string) || "Udemy",
        url: (r.url as string) || null,
        accountEmail: (r.accountEmail as string) ?? (r.account_email as string) ?? null,
        progressPct: pct,
        status: deriveStatus(pct),
        priority: Number(r.priority ?? 3),
        targetDate: (r.targetDate as string) ?? (r.target_date as string) ?? null,
      });
    }
  } catch (e) {
    out.errors.push("Invalid JSON: " + (e as Error).message);
  }
  return out;
}

export default function CourseImport({ open, onClose, onImport, accounts, onAddAccount }: Props) {
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo<ParseResult>(() => {
    const trimmed = text.trim();
    if (!trimmed) return { rows: [], errors: [] };
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) return parseJson(trimmed);
    return parseCsv(trimmed);
  }, [text]);

  // Unknown emails referenced in the paste, that are not in the accounts table.
  const unknownEmails = useMemo(() => {
    const known = new Set(accounts.map((a) => a.email.toLowerCase()));
    const found = new Set<string>();
    for (const r of parsed.rows) {
      if (r.accountEmail && !known.has(r.accountEmail.toLowerCase())) {
        found.add(r.accountEmail);
      }
    }
    return [...found];
  }, [parsed.rows, accounts]);

  const commit = () => {
    if (parsed.rows.length === 0) return;
    onImport(parsed.rows);
    setText("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Import courses (CSV or JSON)" width={700}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="muted" style={{ fontSize: 12 }}>
          Paste CSV with header row, columns:&nbsp;
          <code style={{ fontSize: 11 }}>
            title,stream,account_email,platform,url,total_sections,total_lectures,total_minutes,progress_pct,priority,target_date
          </code>
          . Or paste a JSON array. Required: <strong>title</strong>, <strong>stream</strong>.
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className="ghost"
            onClick={() => fileRef.current?.click()}
          >
            ⬆ Upload file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            style={{ display: "none" }}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const txt = await f.text();
              setText(txt);
              e.target.value = "";
            }}
          />
          <span className="muted" style={{ fontSize: 12 }}>
            …or paste below.
          </span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ minHeight: 200, width: "100%" }}
          placeholder="title,stream,account_email,progress_pct\nMy Course,Dotnet,me@example.com,42"
        />

        {parsed.errors.length > 0 && (
          <div style={{ color: "var(--red)", fontSize: 12 }}>
            {parsed.errors.map((e, i) => <div key={i}>· {e}</div>)}
          </div>
        )}

        {unknownEmails.length > 0 && (
          <div style={{
            border: "1px dashed var(--border-hi)",
            padding: 10,
            borderRadius: 10,
            fontSize: 12,
          }}>
            <div style={{ marginBottom: 6 }}>
              <strong>Unknown account{unknownEmails.length === 1 ? "" : "s"}:</strong>{" "}
              not in your Udemy accounts list yet.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {unknownEmails.map((email) => (
                <div key={email} className="row" style={{ justifyContent: "space-between" }}>
                  <code style={{ fontSize: 11 }}>{email}</code>
                  {onAddAccount && (
                    <button type="button" className="ghost" onClick={() => onAddAccount(email)}>
                      + Add as new account
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {parsed.rows.length > 0 && (
          <div className="muted" style={{ fontSize: 12 }}>
            Preview: <strong>{parsed.rows.length}</strong> course{parsed.rows.length === 1 ? "" : "s"} ready to import
            {parsed.rows.filter((r) => r.accountEmail).length > 0 && (
              <> · <strong>{parsed.rows.filter((r) => r.accountEmail).length}</strong> with an account assigned</>
            )}
            .
          </div>
        )}
        <div className="actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="primary"
            disabled={parsed.rows.length === 0}
            onClick={commit}
          >
            Import {parsed.rows.length || ""}
          </button>
        </div>
      </div>
    </Modal>
  );
}
