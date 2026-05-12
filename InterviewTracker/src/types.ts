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

export type View =
  | "dashboard"
  | "browse"
  | "flashcards"
  | "review"
  | "courses"
  | "course-detail"
  | "accounts";

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
