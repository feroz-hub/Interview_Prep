import { useMemo } from "react";
import type { AppState, Question, Track } from "../../types";
import Screen from "./Screen";
import Section from "./Section";
import InterviewDateCard from "./InterviewDateCard";
import MasteryCard from "./MasteryCard";
import StreakCard from "./StreakCard";

interface Props {
  state: AppState;
  questions: ReadonlyArray<Question>;
  track: Track;
  trackTitle: string;
}

function computeStreak(activity: AppState["activity"]): number {
  let s = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (activity[key] && activity[key].reviews > 0) s += 1;
    else if (i > 0) break;
  }
  return s;
}

export default function MobileDashboard({ state, questions, track, trackTitle }: Props) {
  const stats = useMemo(() => {
    let mastered = 0;
    let started  = 0;
    for (const q of questions) {
      const st = state.progress[q.id]?.status;
      if (st === "mastered") mastered += 1;
      else if (st === "learning" || st === "review") started += 1;
    }
    return { total: questions.length, mastered, started };
  }, [state, questions]);

  const streak = useMemo(() => computeStreak(state.activity), [state.activity]);

  return (
    <Screen>
      <div className="rf-page">
        <Section gap={5}>
          {/* Header — mono category line + bold title. */}
          <header className="rf-stack-3">
            <div className="rf-label">{trackTitle} · Range</div>
            <h1 className="rf-card-heading">
              {streak >= 1 ? "Reps logged. Keep firing." : "Set your line. Then start firing."}
            </h1>
          </header>

          <InterviewDateCard track={track} />
          <MasteryCard total={stats.total} mastered={stats.mastered} started={stats.started} />
          <StreakCard streak={streak} />
        </Section>
      </div>
    </Screen>
  );
}
