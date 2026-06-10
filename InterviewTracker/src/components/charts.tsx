// Dependency-free chart primitives replacing recharts (−108 KB gz from the
// Dashboard route). Bars are plain DOM (crisp at any size, native <title>
// tooltips, CSS-animatable); the donut is a conic-gradient with an HTML
// legend. All colors come through props so theme tokens keep working.

interface BarsProps {
  data: { label: string; value: number }[];
  height?: number;
  /** Render every Nth x-axis label (default 2 — fits 14 days). */
  labelEvery?: number;
  /** Singular unit for tooltips, e.g. "review". */
  unit?: string;
}

/** Single-series vertical bars with hairline grid + max marker. */
export function Bars({ data, height = 240, labelEvery = 2, unit = "" }: BarsProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="ch" style={{ height }}>
      <div className="ch-max" aria-hidden>{max}</div>
      <div className="ch-bars" role="img" aria-label={`Bar chart, peak ${max}${unit ? ` ${unit}s` : ""}`}>
        {data.map((d) => (
          <div key={d.label} className="ch-col" title={`${d.label}: ${d.value}${unit ? ` ${unit}${d.value === 1 ? "" : "s"}` : ""}`}>
            <div
              className="ch-bar"
              style={{ height: `${(d.value / max) * 100}%` }}
              data-zero={d.value === 0 || undefined}
            />
          </div>
        ))}
      </div>
      <div className="ch-x" aria-hidden>
        {data.map((d, i) => (
          <span key={d.label}>{i % labelEvery === 0 ? d.label : ""}</span>
        ))}
      </div>
    </div>
  );
}

export interface Series {
  key: string;
  label: string;
  color: string;
}

interface StackedBarsProps {
  data: { label: string; values: Record<string, number> }[];
  series: Series[];
  height?: number;
}

/** Multi-series stacked vertical bars with legend. */
export function StackedBars({ data, series, height = 170 }: StackedBarsProps) {
  const max = Math.max(
    1,
    ...data.map((d) => series.reduce((s, x) => s + (d.values[x.key] ?? 0), 0))
  );
  return (
    <div className="ch" style={{ height }}>
      <div className="ch-bars" role="img" aria-label="Stacked bar chart">
        {data.map((d) => {
          const total = series.reduce((s, x) => s + (d.values[x.key] ?? 0), 0);
          const tip = `${d.label}: ${series
            .map((s) => `${d.values[s.key] ?? 0} ${s.label.toLowerCase()}`)
            .join(" · ")}`;
          return (
            <div key={d.label} className="ch-col" title={tip}>
              <div className="ch-stack" style={{ height: `${(total / max) * 100}%` }}>
                {series.map((s) =>
                  (d.values[s.key] ?? 0) > 0 ? (
                    <div
                      key={s.key}
                      className="ch-seg"
                      style={{
                        flexGrow: d.values[s.key],
                        background: s.color,
                      }}
                    />
                  ) : null
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="ch-x ch-x-tilt" aria-hidden>
        {data.map((d) => (
          <span key={d.label} title={d.label}>{d.label}</span>
        ))}
      </div>
      <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />
    </div>
  );
}

interface DonutProps {
  slices: { label: string; value: number; color: string }[];
  centerValue?: string;
  centerLabel?: string;
  size?: number;
}

/** Conic-gradient donut with center stat + counted legend. */
export function Donut({ slices, centerValue, centerLabel, size = 132 }: DonutProps) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  const stops = slices
    .map((s) => {
      const from = (acc / total) * 100;
      acc += s.value;
      const to = (acc / total) * 100;
      return `${s.color} ${from.toFixed(2)}% ${to.toFixed(2)}%`;
    })
    .join(", ");
  return (
    <div className="ch-donut-wrap">
      <div
        className="ch-donut"
        style={{ width: size, height: size, background: `conic-gradient(${stops})` }}
        role="img"
        aria-label={slices.map((s) => `${s.label} ${s.value}`).join(", ")}
      >
        <div className="ch-donut-center">
          {centerValue && <strong>{centerValue}</strong>}
          {centerLabel && <span>{centerLabel}</span>}
        </div>
      </div>
      <Legend
        items={slices.map((s) => ({ label: s.label, color: s.color, value: s.value }))}
      />
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string; value?: number }[] }) {
  return (
    <div className="ch-legend">
      {items.map((i) => (
        <span key={i.label} className="ch-legend-item">
          <i style={{ background: i.color }} />
          {i.label}
          {i.value !== undefined && <strong>{i.value}</strong>}
        </span>
      ))}
    </div>
  );
}
