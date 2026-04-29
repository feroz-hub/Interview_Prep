export interface Question {
  id: number;
  topic: string;
  question: string;
  exp: number;
  part: 1 | 2;
}

export type Status = "new" | "learning" | "review" | "mastered";

export interface ProgressEntry {
  status: Status;
  notes: string;
  // Spaced-repetition (SM-2 lite)
  ease: number;          // E-Factor, default 2.5
  interval: number;      // days until next review
  repetitions: number;   // streak of successful reviews
  lastReviewed: string | null;  // ISO date
  nextReview: string | null;    // ISO date
  reviewCount: number;
  correctCount: number;
}

export interface ActivityDay {
  date: string;          // YYYY-MM-DD
  reviews: number;
  marked: number;        // questions whose status was changed that day
}

export interface AppState {
  progress: Record<number, ProgressEntry>;
  activity: Record<string, ActivityDay>;  // by date
}

export type View = "dashboard" | "browse" | "flashcards" | "review";

export type Rating = "again" | "hard" | "good" | "easy";
