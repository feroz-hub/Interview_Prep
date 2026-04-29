import { useCallback, useEffect, useState } from "react";
import type { AppState, ProgressEntry, Rating, Status } from "../types";
import { applyRating, defaultProgress, isoDate } from "../lib/sm2";
import {
  detectNewAchievements,
  detectTopicAchievements,
  type Achievement,
} from "../lib/achievements";
import { fireConfetti } from "../lib/confetti";
import { QUESTIONS } from "../data/questions";
import {
  initDb,
  loadAllProgress,
  loadAllActivity,
  upsertProgress,
  bumpActivity,
  downloadSqliteFile,
  importSqliteFile,
  resetDb,
  dbStats,
} from "../lib/db";

const TOTAL_TOPICS = new Set(QUESTIONS.map((q) => q.topic)).size;

function topicTouchedCount(s: AppState): number {
  const touched = new Set<string>();
  for (const id in s.progress) {
    const q = QUESTIONS.find((x) => x.id === Number(id));
    if (q) touched.add(q.topic);
  }
  return touched.size;
}

export interface UseProgressApi {
  ready: boolean;
  state: AppState;
  get: (id: number) => ProgressEntry;
  setStatus: (id: number, status: Status) => void;
  setNotes: (id: number, notes: string) => void;
  rate: (id: number, r: Rating) => void;
  reset: () => void;
  exportSqlite: () => void;
  importSqlite: (f: File) => Promise<void>;
  stats: () => { sizeBytes: number; tables: { name: string; rows: number }[] };
}

export function useProgress(onAchievement?: (a: Achievement) => void): UseProgressApi {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<AppState>({ progress: {}, activity: {} });

  // Initialize DB once, then hydrate React state
  useEffect(() => {
    let cancelled = false;
    initDb().then(() => {
      if (cancelled) return;
      setState({
        progress: loadAllProgress(),
        activity: loadAllActivity(),
      });
      setReady(true);
    }).catch((e) => {
      console.error("DB init failed:", e);
    });
    return () => { cancelled = true; };
  }, []);

  // Detect achievements after every state update
  useEffect(() => {
    if (!onAchievement || !ready) return;
    const a1 = detectNewAchievements(state, TOTAL_TOPICS);
    const a2 = detectTopicAchievements(topicTouchedCount(state), TOTAL_TOPICS);
    [...a1, ...a2].forEach((a) => onAchievement(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, ready]);

  const get = useCallback(
    (id: number): ProgressEntry => state.progress[id] ?? defaultProgress(),
    [state]
  );

  const updateProgressInState = (id: number, entry: ProgressEntry) => {
    setState((s) => ({ ...s, progress: { ...s.progress, [id]: entry } }));
  };
  const updateActivityInState = (date: string, kind: "reviews" | "marked") => {
    setState((s) => {
      const day = s.activity[date] ?? { date, reviews: 0, marked: 0 };
      return {
        ...s,
        activity: { ...s.activity, [date]: { ...day, [kind]: day[kind] + 1 } },
      };
    });
  };

  const setStatus = useCallback((id: number, status: Status) => {
    if (!ready) return;
    setState((s) => {
      const prev = s.progress[id] ?? defaultProgress();
      const next: ProgressEntry = { ...prev, status };
      if (prev.status === "new" && status !== "new" && !next.nextReview) {
        const t = new Date();
        t.setDate(t.getDate() + 1);
        next.nextReview = t.toISOString();
        next.lastReviewed = new Date().toISOString();
        next.interval = 1;
        next.repetitions = 1;
      }
      if (prev.status !== "mastered" && status === "mastered") {
        setTimeout(() => fireConfetti(), 50);
      }
      // Persist to SQL
      upsertProgress(id, next);
      const date = isoDate();
      bumpActivity(date, "marked");
      const day = s.activity[date] ?? { date, reviews: 0, marked: 0 };
      return {
        ...s,
        progress: { ...s.progress, [id]: next },
        activity: { ...s.activity, [date]: { ...day, marked: day.marked + 1 } },
      };
    });
  }, [ready]);

  const setNotes = useCallback((id: number, notes: string) => {
    if (!ready) return;
    setState((s) => {
      const prev = s.progress[id] ?? defaultProgress();
      const next: ProgressEntry = { ...prev, notes };
      upsertProgress(id, next);
      return { ...s, progress: { ...s.progress, [id]: next } };
    });
  }, [ready]);

  const rate = useCallback((id: number, r: Rating) => {
    if (!ready) return;
    setState((s) => {
      const prev = s.progress[id] ?? defaultProgress();
      const next = applyRating(prev, r);
      if (prev.status !== "mastered" && next.status === "mastered") {
        setTimeout(() => fireConfetti(), 50);
      }
      upsertProgress(id, next);
      const date = isoDate();
      bumpActivity(date, "reviews");
      const day = s.activity[date] ?? { date, reviews: 0, marked: 0 };
      return {
        ...s,
        progress: { ...s.progress, [id]: next },
        activity: { ...s.activity, [date]: { ...day, reviews: day.reviews + 1 } },
      };
    });
  }, [ready]);

  const reset = useCallback(() => {
    if (!confirm("Reset all progress? This wipes the local SQLite database. This cannot be undone.")) return;
    resetDb().then(() => {
      setState({ progress: {}, activity: {} });
    });
  }, []);

  const exportSqlite = useCallback(() => {
    if (!ready) return;
    downloadSqliteFile(`interview-tracker-${isoDate()}.sqlite`);
  }, [ready]);

  const importSqlite = useCallback(async (f: File) => {
    await importSqliteFile(f);
    setState({
      progress: loadAllProgress(),
      activity: loadAllActivity(),
    });
  }, []);

  const stats = useCallback(() => dbStats(), []);

  return { ready, state, get, setStatus, setNotes, rate, reset, exportSqlite, importSqlite, stats };
}

// Re-use shape for activity day not exported elsewhere
// (kept for type-narrowing if needed by callers)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _typehelper(s: AppState) { return s; }
