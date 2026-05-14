import { useCallback, useEffect, useState } from "react";
import type {
  Course,
  CourseSection,
  CourseSession,
  CourseStatus,
  CourseTopic,
  TopicStatus,
} from "../types";
import {
  initDb,
  loadAllCourses,
  loadAllSessions,
  loadSections,
  loadTopics,
  loadAllTopicsForCourse,
  query,
  run,
  tx,
} from "../lib/db";

function isoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

interface CountRow {
  c: number;
}

interface SumRow {
  s: number | null;
}

function deriveCourseStatus(
  pct: number,
  fallback: CourseStatus = "not_started"
): CourseStatus {
  if (pct >= 100) return "completed";
  if (pct > 0) return "in_progress";
  return fallback;
}

export interface UseCoursesApi {
  ready: boolean;
  courses: Course[];
  sessions: CourseSession[];
  reload: () => void;

  getCourseById: (id: number) => Course | undefined;
  getSections: (courseId: number) => CourseSection[];
  getTopics: (sectionId: number) => CourseTopic[];
  getTopicsForCourse: (courseId: number) => CourseTopic[];
  getSessionsForCourse: (courseId: number) => CourseSession[];

  createCourse: (input: Partial<Course> & { title: string; stream: string }) => number | null;
  updateCourse: (id: number, patch: Partial<Course>) => void;
  deleteCourse: (id: number) => void;

  addSection: (
    courseId: number,
    input: { title: string; totalLectures?: number; totalMinutes?: number }
  ) => number;
  updateSection: (id: number, patch: Partial<CourseSection>) => void;
  deleteSection: (id: number) => void;

  addTopic: (
    sectionId: number,
    input: { title: string; durationMin?: number }
  ) => number;
  bulkAddTopics: (
    sectionId: number,
    items: { title: string; durationMin: number }[]
  ) => void;
  updateTopic: (id: number, patch: Partial<CourseTopic>) => void;
  setTopicStatus: (topicId: number, status: TopicStatus) => void;
  deleteTopic: (id: number) => void;

  logSession: (
    courseId: number,
    topicId: number | null,
    minutes: number,
    notes?: string,
    date?: string
  ) => void;

  recomputeProgress: (courseId: number) => void;

  assignAccount: (courseId: number, email: string | null) => void;
  bulkAssignAccount: (courseIds: number[], email: string | null) => void;

  importJson: (json: string) => void;
  exportJson: () => string;
}

export function useCourses(onAchievement?: (id: string) => void): UseCoursesApi {
  const [ready, setReady] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<CourseSession[]>([]);

  const reload = useCallback(() => {
    setCourses(loadAllCourses());
    setSessions(loadAllSessions());
  }, []);

  useEffect(() => {
    let cancelled = false;
    initDb()
      .then(() => {
        if (cancelled) return;
        setCourses(loadAllCourses());
        setSessions(loadAllSessions());
        setReady(true);
      })
      .catch((e) => {
        console.error("useCourses init failed:", e);
        if (cancelled) return;
        // Still flip ready so the app can render its error state instead of
        // hanging on the LoadingScreen forever.
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const getCourseById = useCallback(
    (id: number) => courses.find((c) => c.id === id),
    [courses]
  );

  const getSections = useCallback(
    (courseId: number): CourseSection[] => loadSections(courseId),
    []
  );

  const getTopics = useCallback(
    (sectionId: number): CourseTopic[] => loadTopics(sectionId),
    []
  );

  const getTopicsForCourse = useCallback(
    (courseId: number): CourseTopic[] => loadAllTopicsForCourse(courseId),
    []
  );

  const getSessionsForCourse = useCallback(
    (courseId: number) => sessions.filter((s) => s.courseId === courseId),
    [sessions]
  );

  // Recompute section + course progress from topic durations.
  const recomputeProgressInternal = (courseId: number) => {
    const sectionRows = query<{ id: number }>(
      `SELECT id FROM course_sections WHERE course_id = ?`,
      [courseId]
    );
    for (const s of sectionRows) {
      const tot = query<SumRow>(
        `SELECT COALESCE(SUM(duration_min), 0) AS s FROM course_topics WHERE section_id = ?`,
        [s.id]
      )[0]?.s ?? 0;
      const done = query<SumRow>(
        `SELECT COALESCE(SUM(duration_min), 0) AS s FROM course_topics WHERE section_id = ? AND status = 'completed'`,
        [s.id]
      )[0]?.s ?? 0;
      const pct = tot > 0 ? Math.round((Number(done) / Number(tot)) * 100) : 0;
      const status: CourseStatus = deriveCourseStatus(pct);
      run(
        `UPDATE course_sections SET progress_pct = ?, status = ? WHERE id = ?`,
        [pct, status, s.id]
      );
    }
    // Course rollup
    const totMin = query<SumRow>(
      `SELECT COALESCE(SUM(t.duration_min), 0) AS s
         FROM course_topics t
         JOIN course_sections sc ON sc.id = t.section_id
        WHERE sc.course_id = ?`,
      [courseId]
    )[0]?.s ?? 0;
    if (Number(totMin) > 0) {
      const doneMin = query<SumRow>(
        `SELECT COALESCE(SUM(t.duration_min), 0) AS s
           FROM course_topics t
           JOIN course_sections sc ON sc.id = t.section_id
          WHERE sc.course_id = ? AND t.status = 'completed'`,
        [courseId]
      )[0]?.s ?? 0;
      const pct = Math.round((Number(doneMin) / Number(totMin)) * 100);
      const status = deriveCourseStatus(pct);
      run(
        `UPDATE courses SET progress_pct = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
        [pct, status, courseId]
      );
    }
  };

  const recomputeProgress = useCallback(
    (courseId: number) => {
      recomputeProgressInternal(courseId);
      reload();
    },
    [reload]
  );

  const createCourse = useCallback(
    (input: Partial<Course> & { title: string; stream: string }) => {
      let newId: number | null = null;
      tx(() => {
        run(
          `INSERT INTO courses
             (title, stream, platform, account_email, url, total_sections, total_lectures,
              total_minutes, progress_pct, status, priority, target_date, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            input.title,
            input.stream,
            input.platform ?? "Udemy",
            input.accountEmail ?? null,
            input.url ?? null,
            input.totalSections ?? 0,
            input.totalLectures ?? 0,
            input.totalMinutes ?? 0,
            input.progressPct ?? 0,
            input.status ?? deriveCourseStatus(input.progressPct ?? 0),
            input.priority ?? 3,
            input.targetDate ?? null,
            input.notes ?? "",
          ]
        );
        const r = query<{ id: number }>(`SELECT last_insert_rowid() AS id`)[0];
        newId = r?.id ?? null;
      });
      reload();
      if (onAchievement) onAchievement("first_course_started");
      return newId;
    },
    [reload, onAchievement]
  );

  const updateCourse = useCallback(
    (id: number, patch: Partial<Course>) => {
      const fields: string[] = [];
      const params: unknown[] = [];
      const setField = (col: string, val: unknown) => {
        fields.push(`${col} = ?`);
        params.push(val);
      };
      if (patch.title !== undefined) setField("title", patch.title);
      if (patch.stream !== undefined) setField("stream", patch.stream);
      if (patch.platform !== undefined) setField("platform", patch.platform);
      if (patch.accountEmail !== undefined) setField("account_email", patch.accountEmail);
      if (patch.url !== undefined) setField("url", patch.url);
      if (patch.totalSections !== undefined) setField("total_sections", patch.totalSections);
      if (patch.totalLectures !== undefined) setField("total_lectures", patch.totalLectures);
      if (patch.totalMinutes !== undefined) setField("total_minutes", patch.totalMinutes);
      if (patch.progressPct !== undefined) setField("progress_pct", patch.progressPct);
      if (patch.status !== undefined) setField("status", patch.status);
      if (patch.priority !== undefined) setField("priority", patch.priority);
      if (patch.targetDate !== undefined) setField("target_date", patch.targetDate);
      if (patch.startedAt !== undefined) setField("started_at", patch.startedAt);
      if (patch.completedAt !== undefined) setField("completed_at", patch.completedAt);
      if (patch.notes !== undefined) setField("notes", patch.notes);
      if (fields.length === 0) return;
      fields.push("updated_at = datetime('now')");
      params.push(id);
      run(`UPDATE courses SET ${fields.join(", ")} WHERE id = ?`, params);
      reload();
    },
    [reload]
  );

  const deleteCourse = useCallback(
    (id: number) => {
      tx(() => {
        run(`DELETE FROM courses WHERE id = ?`, [id]);
      });
      reload();
    },
    [reload]
  );

  const nextSectionOrder = (courseId: number): number => {
    const r = query<{ n: number | null }>(
      `SELECT MAX(order_index) AS n FROM course_sections WHERE course_id = ?`,
      [courseId]
    )[0];
    return (r?.n ?? 0) + 1;
  };

  const addSection = useCallback(
    (courseId: number, input: { title: string; totalLectures?: number; totalMinutes?: number }) => {
      let id = 0;
      tx(() => {
        run(
          `INSERT INTO course_sections (course_id, order_index, title, total_lectures, total_minutes)
           VALUES (?, ?, ?, ?, ?)`,
          [
            courseId,
            nextSectionOrder(courseId),
            input.title,
            input.totalLectures ?? 0,
            input.totalMinutes ?? 0,
          ]
        );
        id = query<{ id: number }>(`SELECT last_insert_rowid() AS id`)[0]?.id ?? 0;
        const c = query<CountRow>(
          `SELECT COUNT(*) AS c FROM course_sections WHERE course_id = ?`,
          [courseId]
        )[0]?.c ?? 0;
        run(
          `UPDATE courses SET total_sections = ?, updated_at = datetime('now') WHERE id = ?`,
          [c, courseId]
        );
      });
      reload();
      return id;
    },
    [reload]
  );

  const updateSection = useCallback(
    (id: number, patch: Partial<CourseSection>) => {
      const fields: string[] = [];
      const params: unknown[] = [];
      if (patch.title !== undefined) { fields.push("title = ?"); params.push(patch.title); }
      if (patch.totalLectures !== undefined) { fields.push("total_lectures = ?"); params.push(patch.totalLectures); }
      if (patch.totalMinutes !== undefined) { fields.push("total_minutes = ?"); params.push(patch.totalMinutes); }
      if (patch.notes !== undefined) { fields.push("notes = ?"); params.push(patch.notes); }
      if (patch.status !== undefined) { fields.push("status = ?"); params.push(patch.status); }
      if (fields.length === 0) return;
      params.push(id);
      run(`UPDATE course_sections SET ${fields.join(", ")} WHERE id = ?`, params);
      reload();
    },
    [reload]
  );

  const deleteSection = useCallback(
    (id: number) => {
      const r = query<{ course_id: number }>(
        `SELECT course_id FROM course_sections WHERE id = ?`,
        [id]
      )[0];
      tx(() => {
        run(`DELETE FROM course_sections WHERE id = ?`, [id]);
        if (r) {
          const c = query<CountRow>(
            `SELECT COUNT(*) AS c FROM course_sections WHERE course_id = ?`,
            [r.course_id]
          )[0]?.c ?? 0;
          run(
            `UPDATE courses SET total_sections = ?, updated_at = datetime('now') WHERE id = ?`,
            [c, r.course_id]
          );
        }
      });
      if (r) recomputeProgressInternal(r.course_id);
      reload();
    },
    [reload]
  );

  const nextTopicOrder = (sectionId: number): number => {
    const r = query<{ n: number | null }>(
      `SELECT MAX(order_index) AS n FROM course_topics WHERE section_id = ?`,
      [sectionId]
    )[0];
    return (r?.n ?? 0) + 1;
  };

  const addTopic = useCallback(
    (sectionId: number, input: { title: string; durationMin?: number }) => {
      let id = 0;
      let courseId = 0;
      tx(() => {
        run(
          `INSERT INTO course_topics (section_id, order_index, title, duration_min)
           VALUES (?, ?, ?, ?)`,
          [sectionId, nextTopicOrder(sectionId), input.title, input.durationMin ?? 0]
        );
        id = query<{ id: number }>(`SELECT last_insert_rowid() AS id`)[0]?.id ?? 0;
        courseId =
          query<{ course_id: number }>(
            `SELECT course_id FROM course_sections WHERE id = ?`,
            [sectionId]
          )[0]?.course_id ?? 0;
      });
      if (courseId) recomputeProgressInternal(courseId);
      reload();
      return id;
    },
    [reload]
  );

  const bulkAddTopics = useCallback(
    (sectionId: number, items: { title: string; durationMin: number }[]) => {
      let courseId = 0;
      tx(() => {
        let order = nextTopicOrder(sectionId);
        for (const it of items) {
          run(
            `INSERT INTO course_topics (section_id, order_index, title, duration_min)
             VALUES (?, ?, ?, ?)`,
            [sectionId, order++, it.title, it.durationMin]
          );
        }
        courseId =
          query<{ course_id: number }>(
            `SELECT course_id FROM course_sections WHERE id = ?`,
            [sectionId]
          )[0]?.course_id ?? 0;
      });
      if (courseId) recomputeProgressInternal(courseId);
      reload();
    },
    [reload]
  );

  const updateTopic = useCallback(
    (id: number, patch: Partial<CourseTopic>) => {
      const fields: string[] = [];
      const params: unknown[] = [];
      if (patch.title !== undefined) { fields.push("title = ?"); params.push(patch.title); }
      if (patch.durationMin !== undefined) { fields.push("duration_min = ?"); params.push(patch.durationMin); }
      if (patch.status !== undefined) { fields.push("status = ?"); params.push(patch.status); }
      if (patch.watchedSeconds !== undefined) { fields.push("watched_seconds = ?"); params.push(patch.watchedSeconds); }
      if (patch.rating !== undefined) { fields.push("rating = ?"); params.push(patch.rating); }
      if (patch.notes !== undefined) { fields.push("notes = ?"); params.push(patch.notes); }
      if (patch.completedAt !== undefined) { fields.push("completed_at = ?"); params.push(patch.completedAt); }
      if (fields.length === 0) return;
      params.push(id);
      run(`UPDATE course_topics SET ${fields.join(", ")} WHERE id = ?`, params);

      const cid = query<{ course_id: number }>(
        `SELECT sc.course_id FROM course_topics t
           JOIN course_sections sc ON sc.id = t.section_id
          WHERE t.id = ?`,
        [id]
      )[0]?.course_id;
      if (cid) recomputeProgressInternal(cid);
      reload();
    },
    [reload]
  );

  const setTopicStatus = useCallback(
    (topicId: number, status: TopicStatus) => {
      const completedAt = status === "completed" ? new Date().toISOString() : null;
      run(
        `UPDATE course_topics SET status = ?, completed_at = ? WHERE id = ?`,
        [status, completedAt, topicId]
      );
      const cid = query<{ course_id: number }>(
        `SELECT sc.course_id FROM course_topics t
           JOIN course_sections sc ON sc.id = t.section_id
          WHERE t.id = ?`,
        [topicId]
      )[0]?.course_id;
      if (cid) recomputeProgressInternal(cid);
      reload();
    },
    [reload]
  );

  const deleteTopic = useCallback(
    (id: number) => {
      const cid = query<{ course_id: number }>(
        `SELECT sc.course_id FROM course_topics t
           JOIN course_sections sc ON sc.id = t.section_id
          WHERE t.id = ?`,
        [id]
      )[0]?.course_id;
      run(`DELETE FROM course_topics WHERE id = ?`, [id]);
      if (cid) recomputeProgressInternal(cid);
      reload();
    },
    [reload]
  );

  const logSession = useCallback(
    (
      courseId: number,
      topicId: number | null,
      minutes: number,
      notes: string = "",
      date: string = isoDate()
    ) => {
      run(
        `INSERT INTO course_sessions (course_id, topic_id, date, minutes, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [courseId, topicId, date, minutes, notes]
      );
      run(
        `UPDATE courses SET updated_at = datetime('now'),
            started_at = COALESCE(started_at, datetime('now'))
          WHERE id = ?`,
        [courseId]
      );
      reload();
    },
    [reload]
  );

  const assignAccount = useCallback(
    (courseId: number, email: string | null) => {
      run(
        `UPDATE courses SET account_email = ?, updated_at = datetime('now') WHERE id = ?`,
        [email, courseId]
      );
      reload();
    },
    [reload]
  );

  const bulkAssignAccount = useCallback(
    (courseIds: number[], email: string | null) => {
      if (courseIds.length === 0) return;
      tx(() => {
        for (const id of courseIds) {
          run(
            `UPDATE courses SET account_email = ?, updated_at = datetime('now') WHERE id = ?`,
            [email, id]
          );
        }
      });
      reload();
    },
    [reload]
  );

  const exportJson = useCallback((): string => {
    const allCourses = loadAllCourses();
    const data = allCourses.map((c) => ({
      course: c,
      sections: loadSections(c.id).map((s) => ({
        section: s,
        topics: loadTopics(s.id),
      })),
      sessions: query<CourseSession>(
        `SELECT * FROM course_sessions WHERE course_id = ?`,
        [c.id]
      ),
    }));
    return JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), courses: data }, null, 2);
  }, []);

  const importJson = useCallback(
    (json: string) => {
      const parsed = JSON.parse(json) as {
        courses: Array<{
          course: Partial<Course> & { title: string; stream: string };
          sections?: Array<{
            section: Partial<CourseSection> & { title: string };
            topics?: Array<Partial<CourseTopic> & { title: string }>;
          }>;
          sessions?: Array<Partial<CourseSession>>;
        }>;
      };
      tx(() => {
        for (const block of parsed.courses ?? []) {
          run(
            `INSERT OR IGNORE INTO courses (title, stream, platform, progress_pct, status, priority)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              block.course.title,
              block.course.stream,
              block.course.platform ?? "Udemy",
              block.course.progressPct ?? 0,
              block.course.status ?? deriveCourseStatus(block.course.progressPct ?? 0),
              block.course.priority ?? 3,
            ]
          );
        }
      });
      reload();
    },
    [reload]
  );

  return {
    ready,
    courses,
    sessions,
    reload,
    getCourseById,
    getSections,
    getTopics,
    getTopicsForCourse,
    getSessionsForCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    addSection,
    updateSection,
    deleteSection,
    addTopic,
    bulkAddTopics,
    updateTopic,
    setTopicStatus,
    deleteTopic,
    logSession,
    recomputeProgress,
    assignAccount,
    bulkAssignAccount,
    importJson,
    exportJson,
  };
}

// Helper: parse `01:23 Title here` lines.
// Accepts: "MM:SS Title", "HH:MM:SS Title", "12 Title" (mins).
export function parseBulkTopics(text: string): { title: string; durationMin: number }[] {
  const out: { title: string; durationMin: number }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s+(.+)$/);
    if (m) {
      const hh = m[1] ? Number(m[1]) : 0;
      const mm = Number(m[2]);
      const ss = Number(m[3]);
      const mins = hh * 60 + mm + Math.round(ss / 60);
      out.push({ title: m[4], durationMin: mins });
      continue;
    }
    const mNum = line.match(/^(\d{1,3})\s+(.+)$/);
    if (mNum) {
      out.push({ title: mNum[2], durationMin: Number(mNum[1]) });
      continue;
    }
    out.push({ title: line, durationMin: 0 });
  }
  return out;
}
