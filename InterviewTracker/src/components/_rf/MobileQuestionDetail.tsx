import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { AppState, Confidence, Question, Track } from "../../types";
import Screen from "./Screen";
import Section from "./Section";
import StatusSegmentedControl from "./StatusSegmentedControl";
import ConfidenceSlider from "./ConfidenceSlider";
import { defaultProgress } from "../../lib/sm2";
import { loadReviewLogForQuestion, setQuestionSaved } from "../../lib/db";
import type { ReviewLog } from "../../types";

interface Props {
  question: Question;
  state: AppState;
  track: Track;
  onBack: () => void;
  onPracticeOne: () => void;
  setNotes: (id: number, notes: string) => void;
  setConfidence: (id: number, c: Confidence) => void;
}

function intervalLabel(nextReview: string | null, now: Date): string {
  if (!nextReview) return "New";
  const next = new Date(nextReview);
  const ms = next.getTime() - now.getTime();
  if (ms <= 0) return "Due now";
  const days = Math.ceil(ms / 86400000);
  return days <= 1 ? "Due tomorrow" : `Due in ${days}d`;
}

export default function MobileQuestionDetail({
  question, state, onBack, onPracticeOne, setNotes, setConfidence,
}: Props) {
  const p = state.progress[question.id] ?? defaultProgress();
  const [revealed, setRevealed] = useState<boolean>(false);
  const [notesOpen, setNotesOpen] = useState<boolean>(false);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(p.saved ?? false);
  const reduced = useReducedMotion();
  const now = useMemo(() => new Date(), []);

  const [history, setHistory] = useState<ReadonlyArray<ReviewLog>>([]);
  useEffect(() => {
    setHistory(loadReviewLogForQuestion(question.id, 50));
  }, [question.id]);

  const toggleSave = () => {
    const next = !saved;
    setSaved(next);
    setQuestionSaved(question.id, next);
  };

  return (
    <Screen>
      <div className="rf-page">
        <Section gap={5}>
          <header className="rf-cluster between">
            <button type="button" className="rf-back-btn" onClick={onBack} aria-label="Back">
              ‹ Back
            </button>
            <button
              type="button"
              className={`rf-icon-btn${saved ? " active" : ""}`}
              onClick={toggleSave}
              aria-pressed={saved}
              aria-label={saved ? "Remove from saved" : "Save for later"}
            >
              {saved ? "★" : "☆"}
            </button>
          </header>

          <div className="rf-stack-3">
            <div className="rf-cluster">
              <span className="rf-chapter-chip rf-label">
                {question.chapter ? `Ch ${question.chapter}` : `Part ${question.part}`}
              </span>
              <span className="rf-mono rf-meta">
                #{question.id} · {intervalLabel(p.nextReview, now)}
              </span>
            </div>
            <h1 className="rf-qd-hero">{question.question}</h1>
          </div>

          <div className="rf-stack-3">
            <span className="rf-label">Status (derived)</span>
            <StatusSegmentedControl value={p.status} />
            <p className="rf-card-subhead">Status updates as you review.</p>
          </div>

          <ConfidenceSlider
            value={(p.confidence ?? 0) as Confidence}
            onChange={(c) => setConfidence(question.id, c)}
          />

          <button type="button" className="rf-cta" onClick={onPracticeOne}>
            Practice this question
          </button>

          <div className="rf-cluster rf-stats-row">
            <span className="rf-mono">Reviews: {p.reviewCount}</span>
            <span className="rf-mono">Correct: {p.correctCount}</span>
            <span className="rf-mono">Ease: {p.ease.toFixed(2)}</span>
            <span className="rf-mono">Interval: {p.interval}d</span>
            <span className="rf-mono">Lapses: {p.lapses ?? 0}</span>
          </div>

          {/* Suggested answer (reveal-gated). */}
          {question.answer && (
            <div className="rf-stack-3">
              <p className="rf-card-subhead">Try answering in your own words first.</p>
              {!revealed ? (
                <button
                  type="button"
                  className="rf-ghost-btn"
                  onClick={() => setRevealed(true)}
                >
                  Reveal answer
                </button>
              ) : (
                <motion.div
                  initial={reduced ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 28 }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="rf-answer-body">{question.answer}</div>
                </motion.div>
              )}
            </div>
          )}

          {/* Notes (full-screen on tap). */}
          <div className="rf-stack-3">
            <span className="rf-label">Your notes</span>
            {!notesOpen ? (
              <button
                type="button"
                className="rf-notes-preview"
                onClick={() => setNotesOpen(true)}
              >
                {p.notes ? p.notes : <span className="rf-ink-3">Tap to write…</span>}
              </button>
            ) : (
              <NotesEditor
                initial={p.notes}
                onSave={(t) => { setNotes(question.id, t); setNotesOpen(false); }}
                onCancel={() => setNotesOpen(false)}
              />
            )}
          </div>

          {/* History */}
          <div className="rf-stack-3">
            <button
              type="button"
              className="rf-ghost-btn"
              onClick={() => setHistoryOpen((o) => !o)}
              aria-expanded={historyOpen}
            >
              {historyOpen ? "Hide history" : `Show history (${history.length})`}
            </button>
            {historyOpen && (
              <ul className="rf-history" role="list">
                {history.length === 0 && (
                  <li className="rf-card-subhead">No reviews yet.</li>
                )}
                {history.map((h) => (
                  <li key={h.id} className="rf-history-row">
                    <span className="rf-mono">
                      {new Date(h.ratedAt).toLocaleDateString()}
                    </span>
                    <span className={`rf-rating-chip rating-${h.rating}`}>{h.rating}</span>
                    <span className="rf-mono rf-ink-3">
                      {h.prevInterval}d → {h.newInterval}d
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      </div>
    </Screen>
  );
}

/* ---- Inline full-screen notes editor (token-driven). ---- */
function NotesEditor({
  initial, onSave, onCancel,
}: { initial: string; onSave: (t: string) => void; onCancel: () => void }) {
  const [v, setV] = useState<string>(initial);

  // Autosave debounce 500ms.
  useEffect(() => {
    const t = setTimeout(() => onSave(v), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="rf-notes-editor">
      <textarea
        autoFocus
        className="rf-notes-textarea"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Write your answer, code snippets, mnemonics…"
        aria-label="Notes"
      />
      <div className="rf-cluster" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="rf-ghost-btn" onClick={onCancel}>Done</button>
      </div>
    </div>
  );
}
