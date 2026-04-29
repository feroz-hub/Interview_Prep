import { useEffect, useMemo, useState } from "react";
import type { AppState, Status } from "../types";
import { QUESTIONS } from "../data/questions";
import { defaultProgress } from "../lib/sm2";

interface BrowseProps {
  state: AppState;
  setStatus: (id: number, status: Status) => void;
  setNotes: (id: number, notes: string) => void;
  forcedTopic?: string | null;
  forcedQuestionId?: number | null;
}

const STATUS_OPTIONS: { value: Status | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "Not started" },
  { value: "learning", label: "Learning" },
  { value: "review", label: "Need review" },
  { value: "mastered", label: "Mastered" },
];

const STATUS_LABEL: Record<Status, string> = {
  new: "Not started",
  learning: "Learning",
  review: "Need review",
  mastered: "Mastered",
};

export default function Browse({ state, setStatus, setNotes, forcedTopic, forcedQuestionId }: BrowseProps) {
  const topics = useMemo(() => {
    const set = new Set(QUESTIONS.map(q => q.topic));
    return ["all", ...Array.from(set).sort()];
  }, []);

  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState<string>("all");
  const [status, setStatusFilter] = useState<Status | "all">("all");
  const [selectedId, setSelectedId] = useState<number | null>(QUESTIONS[0]?.id ?? null);

  useEffect(() => {
    if (forcedTopic) setTopic(forcedTopic);
  }, [forcedTopic]);

  useEffect(() => {
    if (forcedQuestionId) {
      setSelectedId(forcedQuestionId);
      // Find question's topic so it shows up in the list
      const q = QUESTIONS.find(x => x.id === forcedQuestionId);
      if (q) {
        setSearch("");
        setStatusFilter("all");
        setTopic("all");
      }
    }
  }, [forcedQuestionId]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return QUESTIONS.filter(q => {
      if (topic !== "all" && q.topic !== topic) return false;
      const st = state.progress[q.id]?.status ?? "new";
      if (status !== "all" && st !== status) return false;
      if (s && !q.question.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [search, topic, status, state]);

  const selected = QUESTIONS.find(q => q.id === selectedId) ?? filtered[0];
  const sp = selected ? (state.progress[selected.id] ?? defaultProgress()) : null;

  return (
    <div className="browse">
      <div className="glass list-pane">
        <div className="filters">
          <input
            placeholder="Search 530 questions…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select value={topic} onChange={e => setTopic(e.target.value)}>
            {topics.map(t => (
              <option key={t} value={t}>
                {t === "all" ? `All topics (${QUESTIONS.length})` : t}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={e => setStatusFilter(e.target.value as Status | "all")}
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center" }}>
            {filtered.length} matching · scroll to see all
          </div>
        </div>
        <div className="list">
          {filtered.map(q => {
            const st = state.progress[q.id]?.status ?? "new";
            return (
              <div
                key={q.id}
                className={`list-item ${selectedId === q.id ? "active" : ""}`}
                onClick={() => setSelectedId(q.id)}
              >
                <div>
                  <span className={`status-dot ${st}`}></span>
                  <span className="q-text">{q.question}</span>
                </div>
                <span className="topic-tag">{q.topic}</span>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="empty"><div className="icon">🔍</div><h3>No matches</h3><div>Try clearing filters</div></div>
          )}
        </div>
      </div>

      <div className="glass detail">
        {selected && sp ? (
          <>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="topic-tag">{selected.topic}</span>
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>#{selected.id} · Part {selected.part}</span>
            </div>
            <h2>{selected.question}</h2>

            <div className="status-row">
              <button onClick={() => setStatus(selected.id, "new")} style={{ opacity: sp.status === "new" ? 1 : 0.7 }}>
                <span className="status-dot new" /> Not started
              </button>
              <button className={sp.status === "learning" ? "warn" : ""} onClick={() => setStatus(selected.id, "learning")}>
                <span className="status-dot learning" /> Learning
              </button>
              <button className={sp.status === "review" ? "danger" : ""} onClick={() => setStatus(selected.id, "review")}>
                <span className="status-dot review" /> Need review
              </button>
              <button className={sp.status === "mastered" ? "success" : ""} onClick={() => setStatus(selected.id, "mastered")}>
                <span className="status-dot mastered" /> Mastered
              </button>
            </div>

            <div className="meta">
              <span>Status: <strong>{STATUS_LABEL[sp.status]}</strong></span>
              <span>Reviews: <strong>{sp.reviewCount}</strong></span>
              <span>Correct: <strong>{sp.correctCount}</strong></span>
              {sp.lastReviewed && (
                <span>Last reviewed: <strong>{new Date(sp.lastReviewed).toLocaleDateString()}</strong></span>
              )}
              {sp.nextReview && (
                <span>Next review: <strong>{new Date(sp.nextReview).toLocaleDateString()}</strong></span>
              )}
            </div>

            <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: "block" }}>
              Your notes / answer
            </label>
            <textarea
              value={sp.notes}
              onChange={e => setNotes(selected.id, e.target.value)}
              placeholder="Write your answer, code snippets, mnemonics… (Markdown-friendly)"
            />

            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8 }}>
              Tip: write in your own words — re-explaining cements memory. These notes show up on the back of the flashcard.
            </div>
          </>
        ) : (
          <div className="empty"><div className="icon">📚</div><h3>Pick a question</h3></div>
        )}
      </div>
    </div>
  );
}
