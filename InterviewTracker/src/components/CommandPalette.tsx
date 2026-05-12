import { useEffect, useMemo, useRef, useState } from "react";
import { QUESTIONS } from "../data/questions";
import type { Course, UdemyAccount } from "../types";

export type PaletteSelection =
  | { kind: "question"; id: number }
  | { kind: "course"; id: number }
  | { kind: "account"; email: string };

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (sel: PaletteSelection) => void;
  courses?: Course[];
  accounts?: UdemyAccount[];
}

interface Item {
  key: string;
  kind: "question" | "course" | "account";
  id: number;       // 0 for account
  email?: string;
  primary: string;
  secondary: string;
  searchHaystack: string;
  iconPrefix: string;
}

export default function CommandPalette({ open, onClose, onSelect, courses = [], accounts = [] }: Props) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const corpus = useMemo<Item[]>(() => {
    const out: Item[] = [];
    // Account filter actions
    for (const a of accounts) {
      out.push({
        key: `account-${a.email}`,
        kind: "account",
        id: 0,
        email: a.email,
        primary: `Filter courses to ${a.displayName ?? a.email.split("@")[0]}`,
        secondary: `Account · ${a.email}`,
        searchHaystack: (`account ${a.email} ${a.displayName ?? ""} filter`).toLowerCase(),
        iconPrefix: "📧",
      });
    }
    for (const c of courses) {
      out.push({
        key: `course-${c.id}`,
        kind: "course",
        id: c.id,
        primary: c.title,
        secondary: `Course · ${c.stream} · ${c.progressPct}%${c.accountEmail ? ` · ${c.accountEmail}` : ""}`,
        searchHaystack: (c.title + " " + c.stream + " course " + (c.accountEmail ?? "")).toLowerCase(),
        iconPrefix: "🎓",
      });
    }
    for (const item of QUESTIONS) {
      out.push({
        key: `q-${item.id}`,
        kind: "question",
        id: item.id,
        primary: item.question,
        secondary: `${item.topic} · #${item.id}`,
        searchHaystack: (item.question + " " + item.topic).toLowerCase(),
        iconPrefix: "❓",
      });
    }
    return out;
  }, [courses, accounts]);

  const results = useMemo<Item[]>(() => {
    if (!q.trim()) return corpus.slice(0, 30);
    const needle = q.toLowerCase();
    const tokens = needle.split(/\s+/).filter(Boolean);
    const scored: { item: Item; score: number }[] = [];
    for (const item of corpus) {
      let score = 0;
      let allMatch = true;
      for (const t of tokens) {
        const i = item.searchHaystack.indexOf(t);
        if (i < 0) { allMatch = false; break; }
        score += t.length / (i + 1);
      }
      if (allMatch) {
        if (item.kind === "account") score *= 1.5;
        else if (item.kind === "course") score *= 1.2;
        scored.push({ item, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 50).map((s) => s.item);
  }, [q, corpus]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setIdx(i => Math.min(results.length - 1, i + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const item = results[idx];
        if (item) {
          if (item.kind === "account") {
            onSelect({ kind: "account", email: item.email! });
          } else {
            onSelect({ kind: item.kind, id: item.id });
          }
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, idx, onSelect, onClose]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  if (!open) return null;

  return (
    <div className="cmd-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="cmd-modal" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          <span className="icon">⌕</span>
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search questions, courses, accounts…"
            value={q}
            onChange={e => { setQ(e.target.value); setIdx(0); }}
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="cmd-results" ref={listRef}>
          {results.length === 0 && <div className="cmd-empty">No matches — try a different word.</div>}
          {results.map((r, i) => (
            <div
              key={r.key}
              data-idx={i}
              className={`cmd-result ${i === idx ? "selected" : ""}`}
              onMouseEnter={() => setIdx(i)}
              onClick={() => {
                if (r.kind === "account") {
                  onSelect({ kind: "account", email: r.email! });
                } else {
                  onSelect({ kind: r.kind, id: r.id });
                }
                onClose();
              }}
            >
              <div className="q">{r.primary}</div>
              <div className="meta">
                <span style={{ color: r.kind === "course" ? "var(--accent)" : r.kind === "account" ? "var(--yellow)" : undefined }}>
                  {r.iconPrefix} {r.secondary}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="cmd-footer">
          <span><span className="kbd">↑</span> <span className="kbd">↓</span> navigate</span>
          <span><span className="kbd">↵</span> open</span>
          <span><span className="kbd">Esc</span> close</span>
        </div>
      </div>
    </div>
  );
}
