import { useMemo } from "react";
import type { AppState } from "../types";
import { QUESTIONS } from "../data/questions";

interface Props {
  state: AppState;
  onTopicClick?: (topic: string) => void;
}

// Radial topic mind-map. Each topic is a node sized by total questions; color by mastery.
export default function Constellation({ state, onTopicClick }: Props) {
  const { topics, totalMastered, totalQuestions } = useMemo(() => {
    const map: Record<string, { total: number; mastered: number; learning: number }> = {};
    for (const q of QUESTIONS) {
      if (!map[q.topic]) map[q.topic] = { total: 0, mastered: 0, learning: 0 };
      map[q.topic].total += 1;
      const st = state.progress[q.id]?.status ?? "new";
      if (st === "mastered") map[q.topic].mastered += 1;
      else if (st !== "new") map[q.topic].learning += 1;
    }
    const arr = Object.entries(map).map(([name, v]) => ({
      name, ...v, pct: v.mastered / v.total,
    })).sort((a, b) => b.total - a.total);
    return {
      topics: arr,
      totalMastered: arr.reduce((s, t) => s + t.mastered, 0),
      totalQuestions: arr.reduce((s, t) => s + t.total, 0),
    };
  }, [state]);

  // SVG layout: viewBox 0 0 600 460, center at (300, 220)
  const cx = 300;
  const cy = 220;
  const w = 600;
  const h = 460;

  // Distribute topics in 2 rings if many, otherwise 1
  const inner = topics.slice(0, Math.min(8, Math.ceil(topics.length / 2)));
  const outer = topics.slice(inner.length);

  const ringPositions = (items: typeof topics, radius: number) =>
    items.map((t, i) => {
      const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2;
      return {
        ...t,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      };
    });
  const innerNodes = ringPositions(inner, 105);
  const outerNodes = ringPositions(outer, 195);
  const allNodes = [...innerNodes, ...outerNodes];

  const sizeFor = (total: number) => {
    // 8 → 32 px diameter mapping, by sqrt for visual area
    const min = 5, max = 60;
    const ratios = topics.map(t => Math.sqrt(t.total));
    const minR = Math.min(...ratios);
    const maxR = Math.max(...ratios);
    const r = Math.sqrt(total);
    const norm = (r - minR) / (maxR - minR || 1);
    return min + norm * (max - min);
  };

  const colorFor = (pct: number) => {
    if (pct === 0) return "var(--text-3)";
    if (pct < 0.25) return "var(--yellow)";
    if (pct < 0.6)  return "var(--accent)";
    if (pct < 0.95) return "var(--accent-2)";
    return "var(--green)";
  };

  return (
    <div className="constellation glass">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        {/* connecting lines from center */}
        {allNodes.map((n, i) => (
          <line
            key={`line-${i}`}
            x1={cx} y1={cy}
            x2={n.x} y2={n.y}
            stroke="var(--border-hi)"
            strokeWidth={0.8}
            strokeDasharray="2 4"
            opacity={0.5}
          />
        ))}

        {/* center circle */}
        <circle cx={cx} cy={cy} r={48}
          fill="var(--bg-3)"
          stroke="var(--accent)"
          strokeWidth={2} />
        <text x={cx} y={cy - 5} className="center-label">{totalMastered}/{totalQuestions}</text>
        <text x={cx} y={cy + 14} className="center-sub">Mastered</text>

        {/* nodes */}
        {allNodes.map((n, i) => {
          const r = sizeFor(n.total);
          const col = colorFor(n.pct);
          return (
            <g key={`n-${i}`} onClick={() => onTopicClick?.(n.name)} style={{ cursor: "pointer" }}>
              <circle
                cx={n.x} cy={n.y} r={r * 0.7}
                fill={col}
                opacity={0.18}
              />
              <circle
                className="node"
                cx={n.x} cy={n.y} r={r * 0.5}
                fill={col}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={1}
              />
              <title>{n.name} · {n.mastered}/{n.total} mastered</title>
              <text
                x={n.x}
                y={n.y + r * 0.5 + 12}
                textAnchor="middle"
                className="node-label"
              >
                {n.name.length > 22 ? n.name.slice(0, 20) + "…" : n.name}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="constellation-tip">Click a node to filter Browse by that topic</div>
    </div>
  );
}
