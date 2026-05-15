import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { AppState, Question, Rating4, Track } from "../../types";
import Screen from "./Screen";
import { defaultProgress, isDue } from "../../lib/sm2";
import { projectInterval } from "../../srs/sm2";

interface Props {
  questions: ReadonlyArray<Question>;
  state: AppState;
  track: Track;
  initialFilter?: { topic: string | "all"; queue: "due" | "new" | "all" | "mastered" | "saved" };
  rate: (id: number, r: Rating4) => void;
  onClose: () => void;
}

const SESSION_SIZE = 20;

/**
 * Session Mode. Single-card-at-a-time review queue. Swipe left = Again,
 * right = Good. Tap or swipe up to reveal answer. 4 rating buttons always
 * tappable as fallback.
 */
export default function MobileSession({
  questions, state, initialFilter, rate, onClose,
}: Props) {
  const reduced = useReducedMotion();

  // Build the queue once at mount. We don't re-build mid-session because
  // ratings would otherwise yank the user's current card out from under them.
  const queue = useMemo<ReadonlyArray<Question>>(() => {
    const now = new Date();
    const topic = initialFilter?.topic ?? "all";
    const kind  = initialFilter?.queue ?? "due";

    const pool = questions.filter((q) => {
      if (topic !== "all" && q.topic !== topic) return false;
      const p = state.progress[q.id];
      switch (kind) {
        case "due":      return isDue(p, now);
        case "new":      return !p || p.status === "new";
        case "mastered": return p?.status === "mastered";
        case "saved":    return p?.saved === true;
        case "all":      return true;
      }
    });
    // Sort: due first by nextReview asc, then 'new' by id asc, then rest stable.
    const sorted = [...pool].sort((a, b) => {
      const pa = state.progress[a.id];
      const pb = state.progress[b.id];
      const da = pa?.nextReview ? new Date(pa.nextReview).getTime() : Number.MAX_SAFE_INTEGER;
      const db = pb?.nextReview ? new Date(pb.nextReview).getTime() : Number.MAX_SAFE_INTEGER;
      return da - db || a.id - b.id;
    });
    return sorted.slice(0, SESSION_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [idx, setIdx]         = useState<number>(0);
  const [revealed, setReveal] = useState<boolean>(false);
  const [breakdown, setB]     = useState<Record<Rating4, number>>({ again: 0, hard: 0, good: 0, easy: 0 });

  const current = queue[idx];
  const progress = current ? (state.progress[current.id] ?? defaultProgress()) : null;
  const total = queue.length;
  const done = idx >= total;

  const handleRate = (r: Rating4) => {
    if (!current) return;
    rate(current.id, r);
    setB((b) => ({ ...b, [r]: b[r] + 1 }));
    setReveal(false);
    setIdx((i) => i + 1);
  };

  // ESC = close (with confirm if mid-session).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") tryClose();
      if (revealed && current) {
        if (e.key === "1") handleRate("again");
        else if (e.key === "2") handleRate("hard");
        else if (e.key === "3") handleRate("good");
        else if (e.key === "4") handleRate("easy");
      }
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setReveal(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, current]);

  const tryClose = () => {
    if (idx > 0 && !done && !confirm("Quit session? Progress so far is saved.")) return;
    onClose();
  };

  if (total === 0) {
    return (
      <Screen>
        <div className="rf-page rf-stack-5">
          <header className="rf-cluster between">
            <h1 className="rf-card-heading">Session</h1>
            <button type="button" className="rf-ghost-btn" onClick={onClose}>Close</button>
          </header>
          <p className="rf-card-subhead">
            Nothing to study right now. Pick a different topic or queue from the Library.
          </p>
        </div>
      </Screen>
    );
  }

  if (done) {
    const total = breakdown.again + breakdown.hard + breakdown.good + breakdown.easy;
    return (
      <Screen>
        <div className="rf-page rf-stack-5">
          <header className="rf-cluster between">
            <span className="rf-label">Session complete</span>
            <button type="button" className="rf-ghost-btn" onClick={onClose}>Done</button>
          </header>
          <div className="rf-metric">
            <div className="rf-label">Cards rated</div>
            <div className="rf-metric-row">
              <span className="rf-hero xl">{total}</span>
            </div>
          </div>
          <div className="rf-cluster rf-stats-row" aria-label="Rating breakdown">
            <span className="rf-rating-chip rating-again">Again {breakdown.again}</span>
            <span className="rf-rating-chip rating-hard">Hard {breakdown.hard}</span>
            <span className="rf-rating-chip rating-good">Good {breakdown.good}</span>
            <span className="rf-rating-chip rating-easy">Easy {breakdown.easy}</span>
          </div>
          <button type="button" className="rf-cta" onClick={onClose}>
            Back to Library
          </button>
        </div>
      </Screen>
    );
  }

  const pct = (idx / total) * 100;
  const srsState = {
    ease: progress?.ease ?? 2.5,
    intervalDays: progress?.interval ?? 0,
    reps: progress?.repetitions ?? 0,
    lapses: progress?.lapses ?? 0,
  };

  // Drag-to-rate (Framer Motion). Threshold of ±100 px.
  const swipeProps = reduced
    ? {}
    : {
        drag: "x" as const,
        dragConstraints: { left: 0, right: 0 },
        onDragEnd: (
          _e: PointerEvent | MouseEvent | TouchEvent,
          info: { offset: { x: number; y: number } },
        ) => {
          if (info.offset.x < -100) handleRate("again");
          else if (info.offset.x > 100) handleRate("good");
          else if (!revealed && info.offset.y < -60) setReveal(true);
        },
      };

  return (
    <Screen>
      {/* Progress strip */}
      <div className="rf-session-progress" aria-label={`Card ${idx + 1} of ${total}`}>
        <div className="fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="rf-page rf-stack-5">
        <header className="rf-cluster between">
          <span className="rf-mono rf-ink-3">{idx + 1} / {total}</span>
          <button type="button" className="rf-ghost-btn" onClick={tryClose}>Close</button>
        </header>

        <AnimatePresence mode="popLayout">
          <motion.article
            key={current.id}
            className="rf-card rf-session-card"
            initial={reduced ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { x: 0, opacity: 0, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            {...swipeProps}
          >
            <div className="rf-cluster">
              <span className="rf-chapter-chip rf-label">
                {current.chapter ? `Ch ${current.chapter}` : `Part ${current.part}`}
              </span>
              <span className="rf-mono rf-ink-3">#{current.id}</span>
            </div>
            <h2 className="rf-qd-hero">{current.question}</h2>

            {!revealed ? (
              <>
                <button
                  type="button"
                  className="rf-cta"
                  onClick={() => setReveal(true)}
                >
                  Reveal answer
                </button>
                {!reduced && (
                  <p className="rf-card-subhead" style={{ textAlign: "center" }}>
                    ↑ swipe up to reveal · ← Again · → Good
                  </p>
                )}
              </>
            ) : (
              <>
                {current.answer && <div className="rf-answer-body">{current.answer}</div>}
                <div className="rf-rate-row">
                  {(["again","hard","good","easy"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`rf-rate-btn rating-${r}`}
                      onClick={() => handleRate(r)}
                    >
                      <span className="rate-label">{r[0].toUpperCase() + r.slice(1)}</span>
                      <span className="rf-mono rate-int">
                        {projectInterval(srsState, r)}d
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.article>
        </AnimatePresence>
      </div>
    </Screen>
  );
}
