// Lightweight SM-2 inspired spaced-repetition.
// Returns a new ProgressEntry given a rating.
import type { ProgressEntry, Rating, Status } from "../types";

export function defaultProgress(): ProgressEntry {
  return {
    status: "new",
    notes: "",
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    lastReviewed: null,
    nextReview: null,
    reviewCount: 0,
    correctCount: 0,
    confidence: 0,
  };
}

// Convert rating into SM-2 "quality" 0-5
function quality(r: Rating): number {
  switch (r) {
    case "again": return 1;   // forgot
    case "hard":  return 3;
    case "good":  return 4;
    case "easy":  return 5;
  }
}

export function applyRating(prev: ProgressEntry, r: Rating, today = new Date()): ProgressEntry {
  const q = quality(r);
  let { ease, interval, repetitions } = prev;

  if (q < 3) {
    // failed -> reset
    repetitions = 0;
    interval = 1; // try again tomorrow
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 3;
    else interval = Math.round(interval * ease);
    // ease update
    ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  }
  // Easy bonus
  if (r === "easy") interval = Math.max(interval, 4);

  const lastReviewed = today.toISOString();
  const next = new Date(today);
  next.setDate(next.getDate() + interval);
  const nextReview = next.toISOString();

  // Status mapping
  let status: Status = prev.status;
  if (r === "again") status = "review";
  else if (r === "easy" && repetitions >= 3) status = "mastered";
  else if (repetitions >= 1 && status === "new") status = "learning";

  return {
    ...prev,
    ease,
    interval,
    repetitions,
    lastReviewed,
    nextReview,
    status,
    reviewCount: prev.reviewCount + 1,
    correctCount: prev.correctCount + (q >= 3 ? 1 : 0),
  };
}

export function isDue(entry: ProgressEntry | undefined, now = new Date()): boolean {
  if (!entry || !entry.nextReview) return false;
  return new Date(entry.nextReview).getTime() <= now.getTime();
}

export function isoDate(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
