import { useMemo, useState } from "react";
import type { AppState, Question, Track } from "../types";
import { getInterviewDate, setInterviewDate } from "../lib/db";

interface Props {
  track: Track;
  questions: Question[];
  state: AppState;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.setHours(0,0,0,0) - a.setHours(0,0,0,0);
  return Math.round(ms / 86400000);
}

export default function CountdownPanel({ track, questions, state }: Props) {
  // Read current interview date for this track. We keep this as local state so
  // that the panel re-renders immediately after a save (DB writes are debounced).
  const [target, setTarget] = useState<string | null>(() => getInterviewDate(track)?.date ?? null);
  const [editing, setEditing] = useState<boolean>(target === null);
  const [draft, setDraft] = useState<string>(target ?? isoDate(new Date(Date.now() + 14 * 86400000)));

  const stats = useMemo(() => {
    const total = questions.length;
    const mastered = questions.filter((q) => state.progress[q.id]?.status === "mastered").length;
    const remaining = total - mastered;
    let daysLeft: number | null = null;
    let quota: number | null = null;
    let pace: "ahead" | "on-track" | "behind" | "noplan" = "noplan";

    if (target) {
      const t = new Date(target + "T00:00:00");
      const today = new Date();
      daysLeft = Math.max(0, daysBetween(today, t));
      if (daysLeft > 0) {
        quota = Math.max(1, Math.ceil(remaining / daysLeft));
        // Pace: compare mastered ratio with expected ratio at this point.
        // For now we just use "ahead" if mastered/total >= 1 - daysLeft/horizon-when-set
        // Simpler heuristic: if quota <= 8, you're cruising; 8-20 on-track; >20 behind.
        if (quota <= 8) pace = "ahead";
        else if (quota <= 20) pace = "on-track";
        else pace = "behind";
      }
    }

    return { total, mastered, remaining, daysLeft, quota, pace };
  }, [target, questions, state]);

  const save = () => {
    if (!draft) return;
    setInterviewDate(track, draft);
    setTarget(draft);
    setEditing(false);
  };

  const clear = () => {
    setInterviewDate(track, null);
    setTarget(null);
    setEditing(true);
    setDraft(isoDate(new Date(Date.now() + 14 * 86400000)));
  };

  const trackLabel = track === "pentest" ? "Pentest" : ".NET";

  if (editing || !target) {
    return (
      <div className="glass countdown-panel countdown-empty">
        <div className="countdown-icon" aria-hidden>🎯</div>
        <div className="countdown-body">
          <div className="countdown-headline">Set your {trackLabel} interview date</div>
          <div className="countdown-sub">
            We'll compute a daily question quota and tell you whether you're ahead, on-track, or behind.
          </div>
          <div className="countdown-form">
            <input
              type="date"
              value={draft}
              min={isoDate(new Date())}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="primary" onClick={save}>Lock it in</button>
            {target && <button className="ghost" onClick={() => setEditing(false)}>Cancel</button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass countdown-panel pace-${stats.pace}`}>
      <div className="countdown-row">
        <div className="countdown-icon" aria-hidden>⏳</div>
        <div className="countdown-headline">
          <div className="countdown-days">
            {stats.daysLeft === 0 ? "Today" : `${stats.daysLeft} day${stats.daysLeft === 1 ? "" : "s"} to go`}
          </div>
          <div className="countdown-sub">{trackLabel} interview on {new Date(target + "T00:00:00").toLocaleDateString()}</div>
        </div>
        <div className="countdown-stat">
          <div className="num">{stats.quota ?? "—"}</div>
          <div className="lbl">questions/day</div>
        </div>
        <div className="countdown-stat">
          <div className="num">{stats.mastered}/{stats.total}</div>
          <div className="lbl">mastered</div>
        </div>
        <div className={`pace-pill pace-${stats.pace}`} title="Pace heuristic based on quota size">
          {stats.pace === "ahead" && "Cruising"}
          {stats.pace === "on-track" && "On track"}
          {stats.pace === "behind" && "Pick up pace"}
          {stats.pace === "noplan" && "—"}
        </div>
        <div className="countdown-actions">
          <button className="ghost" onClick={() => setEditing(true)}>Change</button>
          <button className="ghost" onClick={clear}>Clear</button>
        </div>
      </div>
      {stats.quota !== null && stats.quota > 0 && (
        <div className="countdown-plan">
          <div className="plan-label">7-day projection</div>
          <div className="plan-row">
            {Array.from({ length: 7 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() + i);
              return (
                <div key={i} className="plan-cell">
                  <div className="plan-day">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
                  <div className="plan-num">{stats.quota}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
