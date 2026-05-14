import type { Confidence } from "../types";

interface Props {
  value: Confidence;
  onChange: (c: Confidence) => void;
  label?: string;
  size?: "sm" | "md";
}

const HINTS = ["No clue", "Shaky", "Getting there", "Solid", "Confident", "Could teach this"];

export default function ConfidenceDots({ value, onChange, label = "Confidence", size = "md" }: Props) {
  return (
    <div className={`confidence ${size}`} role="radiogroup" aria-label={label}>
      {label && <span className="confidence-label">{label}</span>}
      <div className="confidence-dots">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={value === n}
            className={`confidence-dot ${value >= n ? "filled" : ""}`}
            onClick={() => onChange((value === n ? 0 : n) as Confidence)}
            title={`${n}/5 — ${HINTS[n]}`}
          >
            <span aria-hidden>●</span>
          </button>
        ))}
        <span className="confidence-hint">{value > 0 ? HINTS[value] : HINTS[0]}</span>
      </div>
    </div>
  );
}
