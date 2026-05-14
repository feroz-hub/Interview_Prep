import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  /** Mono small text printed beside the hero. E.g., " / 530". */
  suffix?: string;
  /** Optional small chip below — delta, percentile, etc. */
  delta?: ReactNode;
  size?: "md" | "lg" | "xl";
  className?: string;
}

/**
 * Composes a metadata label, an editorial hero number, and an optional
 * mono-styled suffix that baseline-aligns to the number's bottom.
 */
export default function Metric({
  label, value, suffix, delta, size = "xl", className,
}: Props) {
  return (
    <div className={`rf-metric${className ? " " + className : ""}`}>
      <div className="rf-label">{label}</div>
      <div className="rf-metric-row">
        <span className={`rf-hero ${size}`}>{value}</span>
        {suffix && <span className="rf-hero-suffix">{suffix}</span>}
      </div>
      {delta && <div>{delta}</div>}
    </div>
  );
}
