import type { Badge, Track } from "../types";
import { badgesFor } from "../lib/pentestBadges";

interface Props {
  unlocked: Badge[];
  track: Track;
}

export default function BadgesShelf({ unlocked, track }: Props) {
  const all = badgesFor(track);
  const unlockedIds = new Set(unlocked.map((b) => b.id));
  return (
    <div className="glass badges-shelf">
      <div className="badges-head">
        <h3>Badges</h3>
        <span className="badges-count">{unlocked.length} / {all.length} unlocked</span>
      </div>
      <div className="badges-grid">
        {all.map((def) => {
          const got = unlockedIds.has(def.id);
          return (
            <div
              key={def.id}
              className={`badge-tile ${got ? "got" : "locked"}`}
              title={got ? `${def.title} — ${def.body}` : `Locked — ${def.body}`}
            >
              <div className="badge-icon" aria-hidden>{def.icon}</div>
              <div className="badge-meta">
                <div className="badge-title">{def.title}</div>
                <div className="badge-body">{def.body}</div>
              </div>
              {got && <div className="badge-checkmark" aria-hidden>✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
