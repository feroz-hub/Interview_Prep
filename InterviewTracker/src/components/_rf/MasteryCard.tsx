import Card from "./Card";
import CountUp from "./CountUp";
import SegmentedProgress from "./SegmentedProgress";

interface Props {
  total: number;
  mastered: number;
  started: number;
}

/**
 * Mastery summary. Replaces the concentric ring. Hero number + mono
 * suffix, segmented progress strip, mono legend.
 */
export default function MasteryCard({ total, mastered, started }: Props) {
  const unseen = Math.max(0, total - mastered - started);
  return (
    <Card>
      <div className="rf-stack-5">
        <div className="rf-metric">
          <div className="rf-label">Questions mastered</div>
          <div className="rf-metric-row" aria-live="polite">
            <span className="rf-hero xl"><CountUp value={mastered} /></span>
            <span className="rf-hero-suffix rf-mono">/ {total}</span>
          </div>
        </div>

        <SegmentedProgress total={total} mastered={mastered} started={started} />

        <div className="rf-legend">
          <span><span className="rf-legend-dot" style={{ background: "var(--rf-state-mastered)" }} />mastered <span className="rf-mono">{mastered}</span></span>
          <span><span className="rf-legend-dot" style={{ background: "var(--rf-state-started)"  }} />started <span className="rf-mono">{started}</span></span>
          <span><span className="rf-legend-dot" style={{ background: "var(--rf-state-unseen)", border: "1px solid var(--rf-border)" }} />unseen <span className="rf-mono">{unseen}</span></span>
        </div>
      </div>
    </Card>
  );
}
