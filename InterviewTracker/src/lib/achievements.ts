// Achievement detection. Now backed by the SQLite achievements table.
import type { AppState, Course, CourseSession } from "../types";
import { loadAchievements, unlockAchievement } from "./db";

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  body: string;
}

const ALL: Achievement[] = [
  { id: "first-mark",     icon: "🎯", title: "First step",        body: "You marked your first question." },
  { id: "first-master",   icon: "⭐", title: "First mastery",      body: "Your first question is now Mastered." },
  { id: "ten-master",     icon: "🏆", title: "10 mastered",        body: "You've mastered 10 questions." },
  { id: "fifty-master",   icon: "💎", title: "Half a hundred",     body: "50 questions mastered. You're flying." },
  { id: "hundred-master", icon: "👑", title: "Centurion",          body: "100 questions mastered. Elite tier." },
  { id: "five-topics",    icon: "🗺️", title: "Explorer",           body: "Started 5 different topics." },
  { id: "all-topics",     icon: "🌍", title: "Cartographer",       body: "Touched every topic in the bank." },
  { id: "ten-reviews",    icon: "🔁", title: "Warming up",         body: "10 total reviews completed." },
  { id: "hundred-reviews",icon: "🔥", title: "Reviewing machine",  body: "100 reviews — habit formed." },
  { id: "streak-3",       icon: "🌱", title: "3-day streak",       body: "Consistency unlocked." },
  { id: "streak-7",       icon: "🔥", title: "7-day streak",       body: "A full week. Keep going." },
  { id: "streak-14",      icon: "💪", title: "14-day streak",      body: "Two weeks straight. Habit locked in." },
  { id: "first_course_started",   icon: "🎬", title: "Course curtain up", body: "You started your first course." },
  { id: "first_course_completed", icon: "🏁", title: "Finish line",       body: "Your first course is in the books." },
  { id: "stream_explorer",        icon: "🧭", title: "Stream explorer",   body: "Started 3 different streams." },
  { id: "polyglot",               icon: "🌐", title: "Polyglot",          body: "In-progress in 5 different streams." },
  { id: "marathoner",             icon: "🏃", title: "Marathoner",        body: "10+ hours logged in a single week." },
  { id: "consistent_learner",     icon: "📆", title: "Consistent learner",body: "Logged a session 7 days in a row." },
  { id: "dotnet_master",          icon: "🟦", title: ".NET master",       body: "Every Dotnet course is at least 50% done." },
  { id: "account_consolidator",   icon: "🔗", title: "Account consolidator", body: "Every course has a Udemy account assigned." },
  { id: "multi_account_juggler",  icon: "🤹", title: "Multi-account juggler", body: "Logged sessions across 3+ accounts in one week." },
];

export function detectNewAchievements(state: AppState, _totalTopics: number): Achievement[] {
  const unlocked = loadAchievements();
  const ach: Achievement[] = [];

  const progresses = Object.values(state.progress);
  const totalMarked = progresses.length;
  const totalMastered = progresses.filter((p) => p.status === "mastered").length;
  const totalReviews = progresses.reduce((s, p) => s + p.reviewCount, 0);

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (state.activity[key] && state.activity[key].reviews > 0) streak += 1;
    else if (i > 0) break;
  }

  const tryUnlock = (id: string, cond: boolean) => {
    if (!cond) return;
    if (unlocked.has(id)) return;
    const def = ALL.find((a) => a.id === id);
    if (def) {
      ach.push(def);
      unlocked.add(id);
      unlockAchievement(id);
    }
  };

  tryUnlock("first-mark",      totalMarked >= 1);
  tryUnlock("first-master",    totalMastered >= 1);
  tryUnlock("ten-master",      totalMastered >= 10);
  tryUnlock("fifty-master",    totalMastered >= 50);
  tryUnlock("hundred-master",  totalMastered >= 100);
  tryUnlock("ten-reviews",     totalReviews >= 10);
  tryUnlock("hundred-reviews", totalReviews >= 100);
  tryUnlock("streak-3",        streak >= 3);
  tryUnlock("streak-7",        streak >= 7);
  tryUnlock("streak-14",       streak >= 14);

  return ach;
}

export function detectCourseAchievements(
  courses: Course[],
  sessions: CourseSession[]
): Achievement[] {
  const unlocked = loadAchievements();
  const out: Achievement[] = [];
  const push = (id: string, cond: boolean) => {
    if (!cond || unlocked.has(id)) return;
    const def = ALL.find((a) => a.id === id);
    if (def) {
      out.push(def);
      unlocked.add(id);
      unlockAchievement(id);
    }
  };

  const inProgress = courses.filter((c) => c.status === "in_progress");
  const completed = courses.filter((c) => c.status === "completed");
  const streamsStarted = new Set(
    courses.filter((c) => c.status !== "not_started").map((c) => c.stream)
  );
  const streamsInProgress = new Set(inProgress.map((c) => c.stream));

  push("first_course_started", inProgress.length + completed.length >= 1);
  push("first_course_completed", completed.length >= 1);
  push("stream_explorer", streamsStarted.size >= 3);
  push("polyglot", streamsInProgress.size >= 5);

  // Marathoner: ≥ 600 minutes (10h) in any 7-day rolling window of recent sessions.
  if (sessions.length > 0) {
    const byDate = new Map<string, number>();
    for (const s of sessions) {
      byDate.set(s.date, (byDate.get(s.date) ?? 0) + s.minutes);
    }
    const dates = [...byDate.keys()].sort();
    const dateNum = (s: string) => Date.parse(s + "T00:00:00Z");
    let marathon = false;
    for (let i = 0; i < dates.length; i++) {
      const winStart = dateNum(dates[i]);
      let total = 0;
      for (let j = i; j < dates.length; j++) {
        const d = dateNum(dates[j]);
        if (d - winStart > 6 * 86400000) break;
        total += byDate.get(dates[j]) ?? 0;
      }
      if (total >= 600) { marathon = true; break; }
    }
    push("marathoner", marathon);

    // Consistent learner: 7 consecutive days with a session.
    const sortedDays = [...byDate.keys()].sort();
    let bestRun = 0;
    let run = 0;
    let prev: number | null = null;
    for (const ds of sortedDays) {
      const d = dateNum(ds);
      if (prev === null || d - prev === 86400000) {
        run = prev === null ? 1 : run + 1;
      } else if (d !== prev) {
        run = 1;
      }
      bestRun = Math.max(bestRun, run);
      prev = d;
    }
    push("consistent_learner", bestRun >= 7);
  }

  // dotnet_master: all Dotnet courses ≥ 50%.
  const dotnet = courses.filter((c) => c.stream === "Dotnet");
  push(
    "dotnet_master",
    dotnet.length > 0 && dotnet.every((c) => c.progressPct >= 50)
  );

  // account_consolidator: every course has an account assigned.
  push(
    "account_consolidator",
    courses.length > 0 && courses.every((c) => !!c.accountEmail)
  );

  // multi_account_juggler: logged sessions across ≥ 3 different accounts in a 7-day window.
  if (sessions.length > 0) {
    const courseAccount = new Map<number, string | null>(
      courses.map((c) => [c.id, c.accountEmail])
    );
    type Entry = { date: number; email: string };
    const entries: Entry[] = sessions
      .map((s) => {
        const email = courseAccount.get(s.courseId);
        return email ? { date: Date.parse(s.date + "T00:00:00Z"), email } : null;
      })
      .filter((x): x is Entry => x !== null)
      .sort((a, b) => a.date - b.date);

    let multi = false;
    for (let i = 0; i < entries.length && !multi; i++) {
      const winStart = entries[i].date;
      const acc = new Set<string>();
      for (let j = i; j < entries.length; j++) {
        if (entries[j].date - winStart > 6 * 86400000) break;
        acc.add(entries[j].email);
        if (acc.size >= 3) { multi = true; break; }
      }
    }
    push("multi_account_juggler", multi);
  }

  return out;
}

export function detectTopicAchievements(touchedTopicCount: number, totalTopics: number): Achievement[] {
  const unlocked = loadAchievements();
  const out: Achievement[] = [];
  if (touchedTopicCount >= 5 && !unlocked.has("five-topics")) {
    out.push(ALL.find((a) => a.id === "five-topics")!);
    unlockAchievement("five-topics");
  }
  if (touchedTopicCount >= totalTopics && totalTopics > 0 && !unlocked.has("all-topics")) {
    out.push(ALL.find((a) => a.id === "all-topics")!);
    unlockAchievement("all-topics");
  }
  return out;
}
