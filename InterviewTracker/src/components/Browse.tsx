import { useEffect, useMemo, useState } from "react";
import type { AppState, Confidence, Question, Status, Track } from "../types";
import { defaultProgress } from "../lib/sm2";
import ConfidenceSlider from "./_rf/ConfidenceSlider";
import StatusSegmentedControl from "./_rf/StatusSegmentedControl";

interface BrowseProps {
  state: AppState;
  setStatus: (id: number, status: Status) => void;
  setNotes: (id: number, notes: string) => void;
  setConfidence: (id: number, c: Confidence) => void;
  forcedTopic?: string | null;
  forcedQuestionId?: number | null;
  questions: Question[];
  track: Track;
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

export default function Browse({
  state,
  setStatus,
  setNotes,
  setConfidence,
  forcedTopic,
  forcedQuestionId,
  questions,
  track,
}: BrowseProps) {
  const topics = useMemo(() => {
    const set = new Set(questions.map((q) => q.topic));
    return ["all", ...Array.from(set).sort()];
  }, [questions]);

  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState<string>("all");
  const [status, setStatusFilter] = useState<Status | "all">("all");
  const [confidenceFilter, setConfidenceFilter] = useState<"all" | "low" | "unrated">("all");
  const [selectedId, setSelectedId] = useState<number | null>(questions[0]?.id ?? null);

  // Reset selection when track changes
  useEffect(() => {
    setSelectedId(questions[0]?.id ?? null);
    setTopic("all");
  }, [track, questions]);

  useEffect(() => {
    if (forcedTopic) setTopic(forcedTopic);
  }, [forcedTopic]);

  useEffect(() => {
    if (forcedQuestionId) {
      setSelectedId(forcedQuestionId);
      const q = questions.find((x) => x.id === forcedQuestionId);
      if (q) {
        setSearch("");
        setStatusFilter("all");
        setTopic("all");
      }
    }
  }, [forcedQuestionId, questions]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return questions.filter((q) => {
      if (topic !== "all" && q.topic !== topic) return false;
      const st = state.progress[q.id]?.status ?? "new";
      if (status !== "all" && st !== status) return false;
      const conf = state.progress[q.id]?.confidence ?? 0;
      if (confidenceFilter === "low" && conf > 2) return false;
      if (confidenceFilter === "unrated" && conf !== 0) return false;
      if (s && !(q.question.toLowerCase().includes(s) || (q.answer ?? "").toLowerCase().includes(s))) return false;
      return true;
    });
  }, [search, topic, status, confidenceFilter, state, questions]);

  const selected = questions.find((q) => q.id === selectedId) ?? filtered[0];
  const sp = selected ? (state.progress[selected.id] ?? defaultProgress()) : null;

  const placeholderQ = `Search ${questions.length} ${track === "pentest" ? "pentest" : "questions"}…`;

  return (
    <div className="browse">
      <div className="glass list-pane">
        <div className="filters">
          <input
            placeholder={placeholderQ}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={topic} onChange={(e) => setTopic(e.target.value)}>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? `All topics (${questions.length})` : t}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatusFilter(e.target.value as Status | "all")}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value as "all" | "low" | "unrated")}
            title="Filter by self-rated confidence"
          >
            <option value="all">All confidence</option>
            <option value="low">Low confidence (≤2)</option>
            <option value="unrated">Unrated</option>
          </select>
          <div style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center" }}>
            {filtered.length} matching · scroll to see all
          </div>
        </div>
        <div className="list">
          {filtered.map((q) => {
            const st = state.progress[q.id]?.status ?? "new";
            const conf = state.progress[q.id]?.confidence ?? 0;
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
                {conf > 0 && (
                  <span className="confidence-mini" title={`Confidence ${conf}/5`}>
                    {"●".repeat(conf)}{"○".repeat(5 - conf)}
                  </span>
                )}
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
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                #{selected.id} · Part {selected.part}
                {selected.chapter ? ` · Ch ${selected.chapter}` : ""}
              </span>
            </div>
            <h2>{selected.question}</h2>

            <div className="rf-stack-3">
              <span className="rf-label">Status (derived)</span>
              <StatusSegmentedControl value={sp.status} />
              <p className="rf-card-subhead">Status updates as you review.</p>
            </div>

            <ConfidenceSlider
              value={(sp.confidence ?? 0) as Confidence}
              onChange={(c) => setConfidence(selected.id, c)}
            />

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

            {selected.answer && (
              <details className="suggested-answer">
                <summary>
                  <strong>Suggested answer</strong>
                  <span className="sa-hint"> — peek only after attempting in your own words</span>
                </summary>
                <div className="sa-body">{selected.answer}</div>
              </details>
            )}

            <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: "block" }}>
              Your notes / answer
            </label>
            <textarea
              value={sp.notes}
              onChange={(e) => setNotes(selected.id, e.target.value)}
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
