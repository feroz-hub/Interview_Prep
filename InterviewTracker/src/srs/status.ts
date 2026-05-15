/**
 * SRS Phase 2 — status derivation. Derived on write from
 * (reps, lapses, intervalDays, last few ratings).
 *
 * Rules:
 *   new      : reps === 0 && lapses === 0
 *   learning : reps < 2
 *   review   : reps >= 2 && intervalDays < 21
 *   mastered : intervalDays >= 21 && no 'again' in last 3 reviews
 */

import type { Status, Rating4 } from "../types";

export interface DerivationInput {
  reps: number;
  lapses: number;
  intervalDays: number;
  /** Last N rating outcomes, newest-first. Pass an empty array if unknown. */
  recentRatings: ReadonlyArray<Rating4>;
}

export function deriveStatus(input: DerivationInput): Status {
  const { reps, lapses, intervalDays, recentRatings } = input;
  if (reps === 0 && lapses === 0) return "new";
  if (reps < 2) return "learning";
  if (intervalDays < 21) return "review";

  // Mastered candidate — verify no lapse in the last 3 ratings.
  const lastThree = recentRatings.slice(0, 3);
  const hadRecentLapse = lastThree.some((r) => r === "again");
  return hadRecentLapse ? "review" : "mastered";
}
