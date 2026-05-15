/**
 * SRS Phase 2 — pure, deterministic spaced-repetition scheduler.
 *
 * Rules:
 *   Again → reps=0, interval=1d,             ease −= 0.20 (floor 1.3), lapses += 1
 *   Hard  → interval = max(1, round(prev*1.2)), ease −= 0.15, reps += 1
 *   Good  → interval = reps===0?1 : reps===1?6 : round(prev*ease), reps += 1
 *   Easy  → interval = reps===0?4 : reps===1?7 : round(prev*ease*1.3), ease += 0.15, reps += 1
 *
 * No side effects. No I/O. Identical inputs always produce identical outputs.
 */

import type { Rating4 } from "../types";

export type SrsRating = Rating4;

export interface SrsState {
  ease: number;          // E-Factor. SM-2 floor is 1.3.
  intervalDays: number;  // current interval in days (0 for fresh).
  reps: number;          // successful rep count (resets on Again).
  lapses: number;        // Again-rated count (monotonic).
}

export interface SrsResult extends SrsState {
  dueAt: Date;           // when the card should next surface.
}

const EASE_FLOOR = 1.3;

export function schedule(state: SrsState, rating: SrsRating, now: Date): SrsResult {
  let { ease, intervalDays, reps, lapses } = state;

  switch (rating) {
    case "again": {
      reps = 0;
      intervalDays = 1;
      ease = Math.max(EASE_FLOOR, ease - 0.20);
      lapses += 1;
      break;
    }
    case "hard": {
      intervalDays = Math.max(1, Math.round(intervalDays * 1.2));
      ease = Math.max(EASE_FLOOR, ease - 0.15);
      reps += 1;
      break;
    }
    case "good": {
      if (reps === 0) intervalDays = 1;
      else if (reps === 1) intervalDays = 6;
      else intervalDays = Math.round(intervalDays * ease);
      reps += 1;
      break;
    }
    case "easy": {
      if (reps === 0) intervalDays = 4;
      else if (reps === 1) intervalDays = 7;
      else intervalDays = Math.round(intervalDays * ease * 1.3);
      ease = ease + 0.15; // no upper bound by spec.
      reps += 1;
      break;
    }
  }

  const dueAt = new Date(now);
  dueAt.setDate(dueAt.getDate() + intervalDays);
  // Normalise to midnight UTC so "due today" comparisons are stable.
  dueAt.setHours(0, 0, 0, 0);

  return { ease, intervalDays, reps, lapses, dueAt };
}

/** Helper for UI: project the next interval *without* mutating state. */
export function projectInterval(state: SrsState, rating: SrsRating): number {
  // Reuse schedule() for correctness, then return only the interval.
  return schedule(state, rating, new Date(0)).intervalDays;
}
