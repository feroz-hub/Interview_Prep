import type { Track } from "../types";
import { levelForXp, levelTitle } from "../lib/xp";

interface Props {
  xp: number;
  track: Track;
}

export default function XPBar({ xp, track }: Props) {
  const { level, xpInLevel, xpToNext, progressPct } = levelForXp(xp);
  const title = levelTitle(track, level);
  return (
    <div className="xp-bar" title={`${xp} XP total — ${xpToNext} XP to level ${level + 1}`}>
      <div className="xp-bar-head">
        <span className="xp-level-pill">Lv {level}</span>
        <span className="xp-title">{title}</span>
        <span className="xp-amount">{xp.toLocaleString()} XP</span>
      </div>
      <div className="xp-bar-track">
        <div className="xp-bar-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="xp-bar-foot">
        <span>{xpInLevel} / {xpInLevel + xpToNext} this level</span>
        <span>{xpToNext} to next</span>
      </div>
    </div>
  );
}
