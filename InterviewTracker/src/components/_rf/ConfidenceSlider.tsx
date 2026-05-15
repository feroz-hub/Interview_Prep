import { useRef } from "react";
import type { Confidence } from "../../types";

interface Props {
  value: Confidence;
  onChange: (next: Confidence) => void;
  label?: string;
}

const HINTS = ["No clue", "Shaky", "Getting there", "Solid", "Confident", "Got it cold"];

/**
 * 0–5 confidence slider. 44 px thumb. `navigator.vibrate(8)` at each
 * detent change. ARIA exposes the value + label.
 */
export default function ConfidenceSlider({ value, onChange, label = "Confidence" }: Props) {
  const lastVibrated = useRef<number>(value);

  const handle = (v: number) => {
    const clamped = Math.max(0, Math.min(5, Math.round(v))) as Confidence;
    if (clamped !== lastVibrated.current) {
      try { (navigator.vibrate ?? (() => {}))(8); } catch { /* noop */ }
      lastVibrated.current = clamped;
    }
    onChange(clamped);
  };

  return (
    <div className="rf-confidence">
      <div className="rf-confidence-head">
        <span className="rf-label">{label}</span>
        <span className="rf-mono rf-confidence-value" aria-live="polite">
          {value}/5 · {HINTS[value]}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={5}
        step={1}
        value={value}
        className="rf-range"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={value}
        aria-valuetext={`${value} out of 5, ${HINTS[value]}`}
        onChange={(e) => handle(Number(e.target.value))}
      />
      <div className="rf-confidence-ends">
        <span>{HINTS[0]}</span>
        <span>{HINTS[5]}</span>
      </div>
    </div>
  );
}
