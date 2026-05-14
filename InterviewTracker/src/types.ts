// A "track" is an interview prep stream — currently .NET and Pentest.
export type Track = "dotnet" | "pentest";

export interface Question {
  id: number;
  topic: string;
  question: string;
  exp: number;
  part: 1 | 2;
  // Optional fields used by Pentest questions; .NET seed leaves these undefined.
  track?: Track;
  chapter?: number;
  answer?: string;
}

export type Status = "new" | "learning" | "review" | "mastered";
export type Confidence = 0 | 1 | 2 | 3 | 4 | 5; // 0 = unrated

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
  // Self-rated confidence (0 = unrated, 1 weak .. 5 strong).
  confidence?: Confidence;
}

// ---------- Motivation layer ----------
export interface XpEvent {
  id: number;
  track: Track;
  date: string;          // ISO timestamp
  kind: string;          // e.g. "mark", "master", "rate-good", "confidence-up"
  amount: number;
  questionId: number | null;
}

export interface Badge {
  id: string;            // unique badge id
  track: Track;
  icon: string;
  title: string;
  body: string;
  unlockedAt: string;    // ISO timestamp
}

export interface InterviewDate {
  track: Track;
  date: string;          // YYYY-MM-DD (target interview date)
  setAt: string;         // when user set it
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

export type View =
  | "dashboard"
  | "browse"
  | "flashcards"
  | "review"
  | "courses"
  | "course-detail"
  | "accounts"
  | "library";

export type Rating = "again" | "hard" | "good" | "easy";

// ---------- Udemy accounts ----------
export interface UdemyAccount {
  id: number;
  email: string;
  displayName: string | null;
  color: string;
  isPrimary: boolean;
  notes: string;
}

// ---------- Courses ----------
export type CourseStatus =
  | "not_started"
  | "in_progress"
  | "paused"
  | "completed"
  | "dropped";

export type TopicStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "skipped";

export interface Course {
  id: number;
  title: string;
  stream: string;
  platform: string;
  accountEmail: string | null;
  url: string | null;
  totalSections: number;
  totalLectures: number;
  totalMinutes: number;
  progressPct: number;       // 0..100
  status: CourseStatus;
  priority: number;          // 1..5
  targetDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseSection {
  id: number;
  courseId: number;
  orderIndex: number;
  title: string;
  totalLectures: number;
  totalMinutes: number;
  progressPct: number;
  status: CourseStatus;
  notes: string;
}

export interface CourseTopic {
  id: number;
  sectionId: number;
  orderIndex: number;
  title: string;
  durationMin: number;
  status: TopicStatus;
  watchedSeconds: number;
  rating: number | null;
  notes: string;
  completedAt: string | null;
}

export interface CourseSession {
  id: number;
  courseId: number;
  topicId: number | null;
  date: string;          // YYYY-MM-DD
  minutes: number;
  notes: string;
}
