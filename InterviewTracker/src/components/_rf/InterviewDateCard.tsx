import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Track } from "../../types";
import { getInterviewDate, setInterviewDate } from "../../lib/db";
import Card from "./Card";

interface Props {
  track: Track;
}

function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }
function daysBetween(a: Date, b: Date): number {
  const ms = b.setHours(0,0,0,0) - a.setHours(0,0,0,0);
  return Math.round(ms / 86400000);
}

/**
 * Editorial-grade interview-date card. Native date input + 56 px CTA,
 * no gradient. Press feedback via Framer Motion spring + optional haptic.
 */
export default function InterviewDateCard({ track }: Props) {
  const [target, setTarget] = useState<string | null>(() => getInterviewDate(track)?.date ?? null);
  const [draft, setDraft] = useState<string>(target ?? isoDate(new Date(Date.now() + 14 * 86400000)));
  const reduced = useReducedMotion();
  const trackLabel = track === "pentest" ? "Pentest" : ".NET";

  const lockIn = () => {
    if (!draft) return;
    setInterviewDate(track, draft);
    setTarget(draft);
    // Subtle haptic, where supported. Failure is silent.
    try { (navigator.vibrate ?? (() => {}))(10); } catch { /* noop */ }
  };

  const clear = () => {
    setInterviewDate(track, null);
    setTarget(null);
  };

  if (target) {
    const t = new Date(target + "T00:00:00");
    const today = new Date();
    const daysLeft = Math.max(0, daysBetween(today, t));
    return (
      <Card>
        <div className="rf-stack-4">
          <div className="rf-label">Interview in</div>
          <div className="rf-metric-row" aria-live="polite">
            <span className="rf-hero lg">{daysLeft}</span>
            <span className="rf-hero-suffix">days · {t.toLocaleDateString()}</span>
          </div>
          <div className="rf-cluster">
            <button type="button" className="rf-ghost-btn" onClick={() => setTarget(null)}>
              Change
            </button>
            <button type="button" className="rf-ghost-btn" onClick={clear}>
              Clear
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="rf-stack-4">
        <h2 className="rf-card-heading">Set your {trackLabel} interview date</h2>
        <p className="rf-card-subhead">
          We'll compute a daily question quota and tell you whether you're ahead, on-track, or behind.
        </p>
        <label className="rf-stack-3">
          <span className="rf-label">Target date</span>
          <input
            className="rf-input"
            type="date"
            value={draft}
            min={isoDate(new Date())}
            inputMode="numeric"
            enterKeyHint="done"
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Interview target date"
          />
        </label>
        <motion.button
          type="button"
          className="rf-cta"
          onClick={lockIn}
          whileTap={reduced ? undefined : { scale: 0.98 }}
          transition={{ type: "spring", stiffness: 600, damping: 28 }}
        >
          Lock it in
        </motion.button>
      </div>
    </Card>
  );
}
