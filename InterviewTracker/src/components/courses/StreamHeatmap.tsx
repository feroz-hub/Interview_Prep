import { useMemo } from "react";
import type { CourseSession, Course } from "../../types";

interface Props {
  courses: Course[];
  sessions: CourseSession[];
  selectedStream: string | null;
  selectedWeek: string | null;
  onCellClick: (stream: string, weekStart: string) => void;
}

// Build last-12-weeks grid of stream × week, color by minutes.
function isoWeekStart(d: Date): Date {
  const out = new Date(d);
  const day = out.getUTCDay();
  const diff = (day + 6) % 7; // Mon-start
  out.setUTCDate(out.getUTCDate() - diff);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function fmtWeek(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function StreamHeatmap({
  courses,
  sessions,
  selectedStream,
  selectedWeek,
  onCellClick,
}: Props) {
  const { streams, weeks, byKey, maxMins } = useMemo(() => {
    const streamSet = new Set(courses.map((c) => c.stream));
    const streams = [...streamSet].sort();
    const now = new Date();
    const thisMonday = isoWeekStart(now);
    const weeks: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const w = new Date(thisMonday);
      w.setUTCDate(w.getUTCDate() - i * 7);
      weeks.push(fmtWeek(w));
    }
    const courseStream = new Map<number, string>(courses.map((c) => [c.id, c.stream]));
    const byKey = new Map<string, number>();
    let max = 0;
    for (const s of sessions) {
      const dt = new Date(s.date + "T00:00:00Z");
      const w = fmtWeek(isoWeekStart(dt));
      if (!weeks.includes(w)) continue;
      const stream = courseStream.get(s.courseId);
      if (!stream) continue;
      const key = `${stream}|${w}`;
      const v = (byKey.get(key) ?? 0) + s.minutes;
      byKey.set(key, v);
      if (v > max) max = v;
    }
    return { streams, weeks, byKey, maxMins: max };
  }, [courses, sessions]);

  const heatLevel = (mins: number): number => {
    if (mins <= 0 || maxMins <= 0) return 0;
    const r = mins / maxMins;
    if (r < 0.25) return 1;
    if (r < 0.5) return 2;
    if (r < 0.75) return 3;
    return 4;
  };

  if (streams.length === 0) {
    return <div className="muted" style={{ fontSize: 12 }}>No courses to heatmap yet.</div>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, alignItems: "center" }}>
      <div></div>
      <div
        className="heatmap-grid"
        style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)`, gridTemplateRows: "auto" }}
      >
        {weeks.map((w) => (
          <div
            key={`hdr-${w}`}
            className="heatmap-axis"
            style={{ fontSize: 9.5, textAlign: "center", color: "var(--text-3)" }}
            title={w}
          >
            {w.slice(5)}
          </div>
        ))}
      </div>
      {streams.map((stream) => (
        <ContextRow
          key={stream}
          stream={stream}
          weeks={weeks}
          byKey={byKey}
          selectedStream={selectedStream}
          selectedWeek={selectedWeek}
          onCellClick={onCellClick}
          heatLevel={heatLevel}
        />
      ))}
    </div>
  );
}

interface RowProps {
  stream: string;
  weeks: string[];
  byKey: Map<string, number>;
  selectedStream: string | null;
  selectedWeek: string | null;
  onCellClick: (stream: string, weekStart: string) => void;
  heatLevel: (m: number) => number;
}

function ContextRow({
  stream,
  weeks,
  byKey,
  selectedStream,
  selectedWeek,
  onCellClick,
  heatLevel,
}: RowProps) {
  return (
    <>
      <div className="heatmap-axis" title={stream}>{stream}</div>
      <div
        className="heatmap-grid"
        style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}
      >
        {weeks.map((w) => {
          const m = byKey.get(`${stream}|${w}`) ?? 0;
          const lvl = heatLevel(m);
          const active = selectedStream === stream && selectedWeek === w;
          return (
            <button
              type="button"
              key={`${stream}-${w}`}
              className={`heatmap-cell h${lvl} ${active ? "active" : ""}`}
              title={`${stream} · week of ${w}: ${m} min`}
              aria-label={`${stream}, week of ${w}, ${m} minutes`}
              onClick={() => onCellClick(stream, w)}
              style={{ border: "none", padding: 0, transform: "none", backdropFilter: "none" }}
            />
          );
        })}
      </div>
    </>
  );
}
