// Achievement detection. Now backed by the SQLite achievements table.
import type { AppState } from "../types";
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
