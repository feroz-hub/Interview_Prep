import { useCallback, useEffect, useState } from "react";
import type { AppState, Confidence, ProgressEntry, Question, Rating, Status, Track } from "../types";
import { defaultProgress, isoDate } from "../lib/sm2";
import { schedule } from "../srs/sm2";
import { deriveStatus } from "../srs/status";
import {
  detectNewAchievements,
  detectTopicAchievements,
  type Achievement,
} from "../lib/achievements";
import { fireConfetti } from "../lib/confetti";
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
  insertReviewLog,
  loadReviewLogForQuestion,
} from "../lib/db";
import { awardXp } from "../lib/xp";

export interface UseProgressApi {
  ready: boolean;
  state: AppState;
  initError: Error | null;
  get: (id: number) => ProgressEntry;
  setStatus: (id: number, status: Status, track: Track) => void;
  setNotes: (id: number, notes: string) => void;
  setConfidence: (id: number, c: Confidence, track: Track) => void;
  rate: (id: number, r: Rating, track: Track) => void;
  reset: () => void;
  exportSqlite: () => void;
  importSqlite: (f: File) => Promise<void>;
  stats: () => { sizeBytes: number; tables: { name: string; rows: number }[] };
}

export function useProgress(
  questions: Question[],
  onAchievement?: (a: Achievement) => void
): UseProgressApi {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);
  const [state, setState] = useState<AppState>({ progress: {}, activity: {} });

  // Initialize DB once, then hydrate React state. If init fails we still set
  // ready=true so the user gets out of the loader and sees the error UI; the
  // DB will be empty but interactive.
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
      if (cancelled) return;
      setInitError(e instanceof Error ? e : new Error(String(e)));
      setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Detect achievements after every state update — scoped to the active question list.
  useEffect(() => {
    if (!onAchievement || !ready) return;
    const a1 = detectNewAchievements(state, new Set(questions.map((q) => q.topic)).size);
    const touchedTopics = new Set<string>();
    for (const id in state.progress) {
      const q = questions.find((x) => x.id === Number(id));
      if (q) touchedTopics.add(q.topic);
    }
    const a2 = detectTopicAchievements(touchedTopics.size, new Set(questions.map((q) => q.topic)).size);
    [...a1, ...a2].forEach((a) => onAchievement(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, ready, questions]);

  const get = useCallback(
    (id: number): ProgressEntry => state.progress[id] ?? defaultProgress(),
    [state]
  );

  const setStatus = useCallback((id: number, status: Status, track: Track) => {
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
        awardXp(track, "first-mark", id);
      }
      if (prev.status !== "mastered" && status === "mastered") {
        setTimeout(() => fireConfetti(), 50);
        awardXp(track, "master", id);
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

  const setConfidence = useCallback((id: number, c: Confidence, track: Track) => {
    if (!ready) return;
    setState((s) => {
      const prev = s.progress[id] ?? defaultProgress();
      const prevC = prev.confidence ?? 0;
      const next: ProgressEntry = { ...prev, confidence: c };
      if (c > prevC) {
        // Award XP for each notch raised — encourages calibration improvement.
        for (let i = 0; i < c - prevC; i++) awardXp(track, "confidence-up", id);
      }
      upsertProgress(id, next);
      return { ...s, progress: { ...s.progress, [id]: next } };
    });
  }, [ready]);

  const rate = useCallback((id: number, r: Rating, track: Track) => {
    if (!ready) return;
    setState((s) => {
      const prev = s.progress[id] ?? defaultProgress();
      const now = new Date();
      // Pure SRS engine — Phase 2.
      const sched = schedule(
        {
          ease: prev.ease,
          intervalDays: prev.interval,
          reps: prev.repetitions,
          lapses: prev.lapses ?? 0,
        },
        r,
        now,
      );
      // Status derivation. Read recent ratings from the log for the "no lapse
      // in last 3" rule. This is O(1) — a 3-row LIMIT query.
      const recent = loadReviewLogForQuestion(id, 3).map((row) => row.rating);
      const status = deriveStatus({
        reps: sched.reps,
        lapses: sched.lapses,
        intervalDays: sched.intervalDays,
        recentRatings: [r, ...recent], // include this rating
      });

      const next: ProgressEntry = {
        ...prev,
        ease: sched.ease,
        interval: sched.intervalDays,
        repetitions: sched.reps,
        lapses: sched.lapses,
        nextReview: sched.dueAt.toISOString(),
        lastReviewed: now.toISOString(),
        reviewCount: prev.reviewCount + 1,
        correctCount: prev.correctCount + (r === "again" ? 0 : 1),
        status,
      };

      if (prev.status !== "mastered" && next.status === "mastered") {
        setTimeout(() => fireConfetti(), 50);
        awardXp(track, "master", id);
      }
      awardXp(track, "rate", id);
      if (r === "good" || r === "easy") awardXp(track, "rate-bonus", id);

      upsertProgress(id, next);
      // Append-only audit log — Phase 1 table.
      insertReviewLog({
        questionId: id,
        ratedAt: now.toISOString(),
        rating: r,
        prevInterval: prev.interval,
        newInterval: sched.intervalDays,
        prevEase: prev.ease,
        newEase: sched.ease,
        responseTimeMs: 0,
      });

      const date = isoDate();
      bumpActivity(date, "reviews");
      const day = s.activity[date] ?? { date, reviews: 0, marked: 0 };
      if (day.reviews === 0) {
        const y = new Date(); y.setDate(y.getDate() - 1);
        const yKey = y.toISOString().slice(0, 10);
        if ((s.activity[yKey]?.reviews ?? 0) > 0) awardXp(track, "streak-bonus", id);
      }
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

  return { ready, state, initError, get, setStatus, setNotes, setConfidence, rate, reset, exportSqlite, importSqlite, stats };
}

// Helper preserved for type-narrowing if needed by callers
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _typehelper(s: AppState) { return s; }
