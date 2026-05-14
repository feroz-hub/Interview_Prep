// XP, levels, and motivational scoring for the interview tracker.
//
// XP rules (per-track, kept intentionally simple so it's predictable):
//   +5   first time a question is marked (status != "new")
//   +15  reaching "mastered" status on a question
//   +2   raising confidence by one notch
//   +1   each spaced-repetition rating (any of Again/Hard/Good/Easy)
//   +3   bonus on Good/Easy ratings
//   +10  daily-streak bonus on first activity of the day after >=1 prior day
//
// Levels use a square-root curve so early levels feel quick and later levels
// require meaningful effort. xpForLevel(L) = 50 * L^2.

import type { Track } from "../types";
import { logXp, totalXpForTrack } from "./db";

export type XpKind =
  | "first-mark"
  | "master"
  | "confidence-up"
  | "rate"
  | "rate-bonus"
  | "streak-bonus";

const AMOUNTS: Record<XpKind, number> = {
  "first-mark": 5,
  "master": 15,
  "confidence-up": 2,
  "rate": 1,
  "rate-bonus": 3,
  "streak-bonus": 10,
};

export function awardXp(track: Track, kind: XpKind, questionId: number | null = null): number {
  const amount = AMOUNTS[kind];
  logXp(track, kind, amount, questionId);
  return amount;
}

export function getTrackXp(track: Track): number {
  return totalXpForTrack(track);
}

// Level math: xp required to reach level L = 50 * L^2.
// So level(xp) = floor(sqrt(xp/50)).
export function levelForXp(xp: number): { level: number; xpInLevel: number; xpToNext: number; progressPct: number } {
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 50)) + 1);
  const base = 50 * Math.pow(level - 1, 2);
  const ceil = 50 * Math.pow(level, 2);
  const xpInLevel = xp - base;
  const xpToNext = ceil - xp;
  const progressPct = Math.min(100, Math.max(0, Math.round((xpInLevel / (ceil - base)) * 100)));
  return { level, xpInLevel, xpToNext, progressPct };
}

export const LEVEL_TITLES_PENTEST = [
  "Script Kiddie",      // 1
  "Recon Apprentice",   // 2
  "Bug Hunter",         // 3
  "Exploit Crafter",    // 4
  "Red Team Operator",  // 5
  "Senior Pentester",   // 6
  "Offensive Engineer", // 7
  "Adversary Emulator", // 8
  "Tradecraft Master",  // 9
  "Zero-Day Wizard",    // 10+
];

export const LEVEL_TITLES_DOTNET = [
  "Hello, World",       // 1
  ".NET Novice",        // 2
  "C# Apprentice",      // 3
  "OOPS Adept",         // 4
  "Framework Engineer", // 5
  "Senior Engineer",    // 6
  "Architect-in-Training", // 7
  "Solutions Architect",// 8
  "Principal Engineer", // 9
  "Distinguished Engineer", // 10+
];

export function levelTitle(track: Track, level: number): string {
  const arr = track === "pentest" ? LEVEL_TITLES_PENTEST : LEVEL_TITLES_DOTNET;
  return arr[Math.min(level - 1, arr.length - 1)];
}
