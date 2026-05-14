import type { CSSProperties } from "react";

interface Props {
  /** Total number of items represented (used for tick rendering). */
  total: number;
  /** Number in "mastered" state. */
  mastered: number;
  /** Number in any "started" state (learning + review). */
  started: number;
  /** Optional max tick count to render. We cap the visual texture so 530
   *  ticks become legible 1-px-ish lines instead of mush. */
  maxTicks?: number;
  className?: string;
}

/**
 * Horizontal segmented progress strip. Single DOM node — two absolutely-
 * positioned colour bands stack from the left, and a CSS repeating-gradient
 * draws the tick texture on top. No 530-element DOM tree.
 */
export default function SegmentedProgress({
  total, mastered, started, maxTicks = 80, className,
}: Props) {
  const safeTotal = Math.max(1, total);
  const masteredPct = (mastered / safeTotal) * 100;
  const startedPct  = ((mastered + started) / safeTotal) * 100;
  // Render a tick line every N items but never more than `maxTicks`
  // (overdraw causes ugly moiré at sub-pixel widths).
  const tickCount = Math.min(maxTicks, safeTotal);

  const style: CSSProperties = {
    ["--rf-tick-count" as never]: tickCount,
  };

  return (
    <div
      className={`rf-progress-strip${className ? " " + className : ""}`}
      role="img"
      aria-label={`${mastered} mastered, ${started} started, ${total - mastered - started} unseen of ${total} total`}
      style={style}
    >
      <div className="fill-started"  style={{ width: `${startedPct}%`  }} />
      <div className="fill-mastered" style={{ width: `${masteredPct}%` }} />
      <div className="ticks" aria-hidden />
    </div>
  );
}
