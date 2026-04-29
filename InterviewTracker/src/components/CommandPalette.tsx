import { useEffect, useMemo, useRef, useState } from "react";
import { QUESTIONS } from "../data/questions";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (questionId: number) => void;
}

export default function CommandPalette({ open, onClose, onSelect }: Props) {
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

  const results = useMemo(() => {
    if (!q.trim()) return QUESTIONS.slice(0, 30);
    const needle = q.toLowerCase();
    const tokens = needle.split(/\s+/).filter(Boolean);
    const scored: { item: typeof QUESTIONS[0]; score: number }[] = [];
    for (const item of QUESTIONS) {
      const hay = (item.question + " " + item.topic).toLowerCase();
      let score = 0;
      let allMatch = true;
      for (const t of tokens) {
        const i = hay.indexOf(t);
        if (i < 0) { allMatch = false; break; }
        score += t.length / (i + 1);
      }
      if (allMatch) scored.push({ item, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 50).map(s => s.item);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setIdx(i => Math.min(results.length - 1, i + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const item = results[idx];
        if (item) { onSelect(item.id); onClose(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, idx, onSelect, onClose]);

  // Keep selected in view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  if (!open) return null;

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-modal" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          <span className="icon">⌕</span>
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search 530 questions or topics..."
            value={q}
            onChange={e => { setQ(e.target.value); setIdx(0); }}
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="cmd-results" ref={listRef}>
          {results.length === 0 && <div className="cmd-empty">No matches — try a different word.</div>}
          {results.map((r, i) => (
            <div
              key={r.id}
              data-idx={i}
              className={`cmd-result ${i === idx ? "selected" : ""}`}
              onMouseEnter={() => setIdx(i)}
              onClick={() => { onSelect(r.id); onClose(); }}
            >
              <div className="q">{r.question}</div>
              <div className="meta"><span>{r.topic}</span><span>·</span><span>#{r.id}</span></div>
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
