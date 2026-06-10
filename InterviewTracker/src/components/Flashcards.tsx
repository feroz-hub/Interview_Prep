import { useEffect, useMemo, useState } from "react";
import type { AppState, Confidence, Question, Rating, Track } from "../types";
import { defaultProgress, isDue, applyRating } from "../lib/sm2";
import ConfidenceSlider from "./_rf/ConfidenceSlider";

interface FlashcardsProps {
  state: AppState;
  rate: (id: number, r: Rating) => void;
  setConfidence: (id: number, c: Confidence) => void;
  mode: "all" | "review";
  questions: Question[];
  track: Track;
}

export default function Flashcards({ state, rate, setConfidence, mode, questions, track }: FlashcardsProps) {
  const queue = useMemo(() => {
    if (mode === "review") {
      const now = new Date();
      return questions.filter((q) => isDue(state.progress[q.id], now));
    }
    const arr = [...questions];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, questions]);

  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [focus, setFocus] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => { setIdx(0); setFlipped(false); setShowAnswer(false); }, [queue, track]);

  const current = queue[idx];
  const progress = current ? (state.progress[current.id] ?? defaultProgress()) : null;

  const onRate = (r: Rating) => {
    if (!current) return;
    rate(current.id, r);
    setFlipped(false);
    setShowAnswer(false);
    setTimeout(() => setIdx((i) => i + 1), 250);
  };
  const skip = () => { setFlipped(false); setShowAnswer(false); setTimeout(() => setIdx((i) => i + 1), 100); };
  const previewInterval = (r: Rating): string => {
    if (!progress) return "";
    const next = applyRating(progress, r);
    return `${next.interval}d`;
  };

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT")) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped((f) => !f); }
      else if (flipped) {
        if (e.key === "1") onRate("again");
        else if (e.key === "2") onRate("hard");
        else if (e.key === "3") onRate("good");
        else if (e.key === "4") onRate("easy");
      } else if (e.key === "ArrowRight") skip();
      else if (e.key === "a") setShowAnswer((s) => !s);
      else if (e.key === "f" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setFocus((f) => !f); }
      else if (e.key === "Escape" && focus) setFocus(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, current, focus]);

  if (queue.length === 0) {
    return (
      <div className="empty">
        <div className="icon">{mode === "review" ? "🎉" : "📭"}</div>
        <h3>{mode === "review" ? "Nothing due for review" : "No questions"}</h3>
        <div>
          {mode === "review"
            ? "All caught up. Use the Flashcards tab to study fresh ones."
            : "Something went wrong loading questions."}
        </div>
      </div>
    );
  }

  if (idx >= queue.length) {
    return (
      <div className="empty">
        <div className="icon">🎉</div>
        <h3>Session complete!</h3>
        <div style={{ marginBottom: 16 }}>
          You went through {queue.length} card{queue.length === 1 ? "" : "s"}. Great work.
        </div>
        <button className="primary" onClick={() => { setIdx(0); setFlipped(false); setShowAnswer(false); }}>
          Start over
        </button>
      </div>
    );
  }

  const progressPct = ((idx) / queue.length) * 100;

  return (
    <div className={`flashcard-view ${focus ? "focus" : ""}`}>
      <div className="flashcard-progress">
        <span>{mode === "review" ? "Review" : "Study"} · {idx + 1}/{queue.length} · {track === "pentest" ? "🛡️ Pentest" : "🟦 .NET"}</span>
        <div className="progress-mini"><div className="fill" style={{ width: `${progressPct}%` }} /></div>
        <div className="row" style={{ gap: 6 }}>
          <span><span className="kbd">Space</span> flip</span>
          <span><span className="kbd">A</span> answer</span>
          <span><span className="kbd">→</span> skip</span>
          <button className="ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setFocus((f) => !f)} title="Focus / Zen mode (⌘F)">
            {focus ? "Exit focus" : "Focus mode"}
          </button>
        </div>
      </div>

      {current && (
        <div className="card-stage">
        <div
          key={current.id}
          className={`flashcard-3d ${flipped ? "flipped" : ""}`}
          onClick={() => setFlipped((f) => !f)}
          style={{ cursor: "pointer" }}
        >
          <div className="flashcard-face front">
            <span className="topic-tag">{current.topic}</span>
            <div className="question">{current.question}</div>
            <div style={{ textAlign: "center", color: "var(--text-3)", fontSize: 12, marginTop: 12 }}>
              Click card or press <span className="kbd">Space</span> to reveal your answer
              {current.answer && (
                <> · press <span className="kbd">A</span> for the suggested answer</>
              )}
            </div>
          </div>
          <div className="flashcard-face back">
            <span className="topic-tag">{current.topic}</span>
            <div className="answer-label">Your answer / notes</div>
            <div className="notes">
              {progress?.notes
                ? progress.notes
                : <span className="notes-empty">No notes yet — open Browse tab to add your own answer for this question.</span>}
            </div>
            {current.answer && (
              <details className="suggested-answer" open={showAnswer} onToggle={(e) => setShowAnswer((e.target as HTMLDetailsElement).open)} onClick={(e) => e.stopPropagation()}>
                <summary><strong>Suggested answer</strong></summary>
                <div className="sa-body">{current.answer}</div>
              </details>
            )}
          </div>
        </div>
        </div>
      )}

      {!flipped ? (
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <button className="primary" style={{ flex: 1, padding: 16, fontSize: 14 }} onClick={() => setFlipped(true)}>
            Reveal answer
          </button>
          <button onClick={skip} style={{ padding: "0 18px" }}>Skip →</button>
        </div>
      ) : (
        <>
          <div className="rate-row">
            <button className="danger" onClick={() => onRate("again")}>
              <span>Again</span>
              <span className="interval">{previewInterval("again")}</span>
            </button>
            <button className="warn" onClick={() => onRate("hard")}>
              <span>Hard</span>
              <span className="interval">{previewInterval("hard")}</span>
            </button>
            <button className="primary" onClick={() => onRate("good")}>
              <span>Good</span>
              <span className="interval">{previewInterval("good")}</span>
            </button>
            <button className="success" onClick={() => onRate("easy")}>
              <span>Easy</span>
              <span className="interval">{previewInterval("easy")}</span>
            </button>
          </div>
          {current && (
            <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 10 }}>
              <ConfidenceSlider
                value={(progress?.confidence ?? 0) as Confidence}
                onChange={(c) => setConfidence(current.id, c)}
                label="How confident did you feel?"
              />
            </div>
          )}
        </>
      )}

      <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6, textAlign: "center" }}>
        Rate <span className="kbd">1</span> Again · <span className="kbd">2</span> Hard · <span className="kbd">3</span> Good · <span className="kbd">4</span> Easy
      </div>
    </div>
  );
}
