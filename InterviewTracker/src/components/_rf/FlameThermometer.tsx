import type { CSSProperties } from "react";

interface Props {
  /** Number of consecutive streak days. */
  streak: number;
  /** Day count at which the bar reaches 100%. Default 30. */
  fullAt?: number;
  className?: string;
}

/**
 * Vertical fill bar on the left edge of its parent card. Height of the
 * fill is driven by `--streak` (0..1), interpolated against `fullAt`.
 *
 * Color band: cold grey → ember orange (around fullAt/2) → white-hot.
 * Mount as the first child of a `.rf-card.accent-leading` parent so the
 * card's `padding-inline-start` reserves room for the bar.
 */
export default function FlameThermometer({ streak, fullAt = 30, className }: Props) {
  const clamped = Math.max(0, Math.min(1, streak / fullAt));
  const style: CSSProperties = {
    ["--streak" as never]: clamped,
  };
  return (
    <div
      className={`rf-streak-thermo${className ? " " + className : ""}`}
      style={style}
      aria-hidden
    />
  );
}
