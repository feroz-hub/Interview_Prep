import { motion, useReducedMotion } from "framer-motion";
import Card from "./Card";
import FlameThermometer from "./FlameThermometer";

interface Props {
  streak: number;
}

const ENCOURAGEMENT: Record<string, string> = {
  zero:   "Do one review today to start a streak.",
  small:  "Nice. Three in a row unlocks a badge.",
  warm:   "Habit forming — keep it going.",
  strong: "A week strong. You've got rhythm.",
  elite:  "Two weeks straight. Elite consistency.",
};

function copyFor(s: number): string {
  if (s === 0)  return ENCOURAGEMENT.zero;
  if (s < 3)    return ENCOURAGEMENT.small;
  if (s < 7)    return ENCOURAGEMENT.warm;
  if (s < 14)   return ENCOURAGEMENT.strong;
  return ENCOURAGEMENT.elite;
}

export default function StreakCard({ streak }: Props) {
  const reduced = useReducedMotion();

  // Idle flicker animation. Vertical translate + scale, low amplitude.
  // Only shown while streak >= 1 and reduced-motion is off.
  const flameAnim = !reduced && streak >= 1
    ? {
        animate: { y: [0, -2, 0, -1, 0], scale: [1, 1.04, 0.99, 1.03, 1] },
        transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" as const },
      }
    : {};

  return (
    <Card accentLeading className="rf-streak-card">
      <FlameThermometer streak={streak} fullAt={30} />
      <div className="rf-cluster" style={{ alignItems: "center", gap: "var(--rf-space-4)" }}>
        <motion.span className="rf-streak-flame" aria-hidden {...flameAnim}>
          🔥
        </motion.span>
        <div className="rf-stack-3" style={{ flex: 1, minWidth: 0 }}>
          <div className="rf-metric-row" aria-live="polite">
            <span className="rf-hero lg">{streak}</span>
            <span className="rf-hero-suffix">day{streak === 1 ? "" : "s"} streak</span>
          </div>
          <p className="rf-card-subhead">{copyFor(streak)}</p>
        </div>
      </div>
    </Card>
  );
}
