import { useMemo } from "react";
import type { AppState, Question } from "../../types";
import Screen from "./Screen";
import Section from "./Section";
import MasteryCard from "./MasteryCard";
import StreakCard from "./StreakCard";
import Card from "./Card";

interface Props {
  state: AppState;
  questions: ReadonlyArray<Question>;
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

export default function MobileStats({ state, questions }: Props) {
  const m = useMemo(() => {
    let mastered = 0, started = 0, totalReviews = 0, totalCorrect = 0;
    for (const q of questions) {
      const p = state.progress[q.id];
      if (p?.status === "mastered") mastered += 1;
      else if (p?.status === "learning" || p?.status === "review") started += 1;
      totalReviews += p?.reviewCount ?? 0;
      totalCorrect += p?.correctCount ?? 0;
    }
    const accuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;
    return { total: questions.length, mastered, started, totalReviews, accuracy };
  }, [state, questions]);

  const streak = useMemo(() => computeStreak(state.activity), [state.activity]);

  return (
    <Screen>
      <div className="rf-page">
        <Section gap={5}>
          <header className="rf-stack-3">
            <div className="rf-label">Stats</div>
            <h1 className="rf-card-heading">Where the work has landed.</h1>
          </header>

          <MasteryCard total={m.total} mastered={m.mastered} started={m.started} />
          <StreakCard streak={streak} />

          <Card>
            <div className="rf-stack-3">
              <div className="rf-label">Lifetime</div>
              <div className="rf-cluster rf-stats-row">
                <span className="rf-mono">Reviews: {m.totalReviews}</span>
                <span className="rf-mono">Accuracy: {m.accuracy}%</span>
                <span className="rf-mono">Untouched: {m.total - m.mastered - m.started}</span>
              </div>
            </div>
          </Card>
        </Section>
      </div>
    </Screen>
  );
}
