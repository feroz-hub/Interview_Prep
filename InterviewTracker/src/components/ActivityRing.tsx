import { useEffect, useState } from "react";

interface Props {
  size?: number;
  stroke?: number;
  rings: { color: string; pct: number; label: string }[];
  centerPct: number;
}

// Concentric SVG rings (Apple-Watch style). pct: 0..100.
export default function ActivityRing({ size = 220, stroke = 18, rings, centerPct }: Props) {
  // Animate from 0 → target
  const [animPcts, setAnimPcts] = useState<number[]>(rings.map(() => 0));
  const [animCenter, setAnimCenter] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const start = performance.now();
    const duration = 900;
    const initialPcts = animPcts;
    const initialCenter = animCenter;
    const targetPcts = rings.map(r => r.pct);
    const targetCenter = centerPct;
    const step = (now: number) => {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimPcts(targetPcts.map((tp, i) =>
        initialPcts[i] + (tp - initialPcts[i]) * eased));
      setAnimCenter(initialCenter + (targetCenter - initialCenter) * eased);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rings.map(r => r.pct).join(","), centerPct]);

  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          {rings.map((r, i) => (
            <linearGradient key={i} id={`ring-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={r.color} stopOpacity="0.85" />
              <stop offset="100%" stopColor={r.color} stopOpacity="1" />
            </linearGradient>
          ))}
        </defs>
        {rings.map((r, i) => {
          const radius = cx - stroke / 2 - i * (stroke + 5);
          if (radius < 12) return null;
          const circ = 2 * Math.PI * radius;
          const offset = circ * (1 - animPcts[i] / 100);
          return (
            <g key={i}>
              <circle
                cx={cx} cy={cy} r={radius}
                fill="none"
                stroke={r.color}
                strokeOpacity={0.18}
                strokeWidth={stroke}
              />
              <circle
                cx={cx} cy={cy} r={radius}
                fill="none"
                stroke={`url(#ring-grad-${i})`}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
              />
            </g>
          );
        })}
      </svg>
      <div className="center">
        <div>
          <div className="pct">{Math.round(animCenter)}%</div>
          <div className="pct-label">Mastered</div>
        </div>
      </div>
    </div>
  );
}
