import { useMemo, useState } from "react";
import type { AppState, Question } from "../../types";
import Screen from "./Screen";
import Section from "./Section";
import { isDue } from "../../lib/sm2";

type Queue = "due" | "new" | "all" | "mastered" | "saved";

interface Props {
  questions: ReadonlyArray<Question>;
  state: AppState;
  onOpenQuestion: (id: number) => void;
  onStartSession: (filter: { topic: string | "all"; queue: Queue }) => void;
}

const QUEUE_TABS: ReadonlyArray<{ id: Queue; label: string }> = [
  { id: "due",      label: "Due" },
  { id: "new",      label: "New" },
  { id: "all",      label: "All" },
  { id: "mastered", label: "Mastered" },
  { id: "saved",    label: "Saved" },
];

function intervalLabel(nextReview: string | null | undefined, now: Date): string {
  if (!nextReview) return "New";
  const next = new Date(nextReview);
  const ms = next.getTime() - now.getTime();
  if (ms <= 0) return "Due now";
  const days = Math.ceil(ms / 86400000);
  if (days <= 1) return "Due tomorrow";
  return `Due in ${days}d`;
}

/**
 * Library v2 — topic pill rail, queue tabs, virtualization-free list
 * (lists are 500–1000 rows; perf OK without). Sticky "Start session" CTA.
 */
export default function MobileLibraryV2({ questions, state, onOpenQuestion, onStartSession }: Props) {
  const [topic, setTopic] = useState<string | "all">("all");
  const [queue, setQueue] = useState<Queue>("due");
  const now = useMemo(() => new Date(), []);

  const topics = useMemo<ReadonlyArray<string>>(() => {
    const set = new Set<string>();
    for (const q of questions) set.add(q.topic);
    return ["all", ...Array.from(set).sort()];
  }, [questions]);

  const filtered = useMemo<ReadonlyArray<Question>>(() => {
    return questions.filter((q) => {
      if (topic !== "all" && q.topic !== topic) return false;
      const p = state.progress[q.id];
      switch (queue) {
        case "due":      return isDue(p, now);
        case "new":      return !p || (p.status === "new");
        case "mastered": return p?.status === "mastered";
        case "saved":    return p?.saved === true;
        case "all":      return true;
      }
    });
  }, [questions, state, topic, queue, now]);

  const counts = useMemo(() => {
    const c: Record<Queue, number> = { due: 0, new: 0, all: 0, mastered: 0, saved: 0 };
    for (const q of questions) {
      if (topic !== "all" && q.topic !== topic) continue;
      const p = state.progress[q.id];
      c.all += 1;
      if (isDue(p, now))           c.due      += 1;
      if (!p || p.status === "new") c.new     += 1;
      if (p?.status === "mastered") c.mastered+= 1;
      if (p?.saved)                c.saved    += 1;
    }
    return c;
  }, [questions, state, topic, now]);

  const sessionDisabled = counts.due === 0 && counts.new === 0;

  return (
    <Screen>
      <div className="rf-page">
        <Section gap={4}>
          <header className="rf-stack-3">
            <div className="rf-label">Library</div>
            <h1 className="rf-card-heading">{filtered.length} cards in scope.</h1>
          </header>

          {/* Topic pill rail — horizontal scroll where it overflows. */}
          <div className="rf-rail" role="tablist" aria-label="Topic">
            {topics.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={topic === t}
                className={`rf-rail-pill${topic === t ? " active" : ""}`}
                onClick={() => setTopic(t)}
              >
                {t === "all" ? "All topics" : t}
              </button>
            ))}
          </div>

          {/* Queue tabs */}
          <div className="rf-rail rf-rail-queue" role="tablist" aria-label="Queue">
            {QUEUE_TABS.map((q) => (
              <button
                key={q.id}
                type="button"
                role="tab"
                aria-selected={queue === q.id}
                className={`rf-rail-pill secondary${queue === q.id ? " active" : ""}`}
                onClick={() => setQueue(q.id)}
              >
                {q.label} <span className="rf-mono rf-rail-count">{counts[q.id]}</span>
              </button>
            ))}
          </div>

          {/* List */}
          <ul className="rf-list" role="list">
            {filtered.length === 0 && (
              <li className="rf-list-empty rf-card-subhead">
                Nothing here in this queue. Try another tab.
              </li>
            )}
            {filtered.map((q) => {
              const p = state.progress[q.id];
              const status = p?.status ?? "new";
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    className="rf-list-item"
                    onClick={() => onOpenQuestion(q.id)}
                  >
                    <div className="rf-list-item-meta">
                      <span className="rf-label rf-chapter-chip">
                        {q.chapter ? `Ch ${q.chapter}` : `Part ${q.part}`}
                      </span>
                      <span className={`rf-status-dot status-${status}`} aria-hidden />
                      <span className="rf-mono rf-list-item-due">{intervalLabel(p?.nextReview ?? null, now)}</span>
                      {p?.saved && <span className="rf-star" aria-hidden>★</span>}
                    </div>
                    <div className="rf-list-item-title">{q.question}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>

      {/* Sticky "Start session" CTA */}
      <div className="rf-sticky-cta">
        <button
          type="button"
          className="rf-cta"
          disabled={sessionDisabled}
          onClick={() => onStartSession({ topic, queue })}
        >
          {sessionDisabled
            ? "Nothing to study right now"
            : `Start session · ${Math.min(20, counts.due + counts.new)} cards`}
        </button>
      </div>
    </Screen>
  );
}
