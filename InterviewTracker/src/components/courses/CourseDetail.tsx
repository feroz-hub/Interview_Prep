import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import type {
  Course,
  CourseSection,
  CourseSession,
  CourseTopic,
  TopicStatus,
  UdemyAccount,
} from "../../types";
import { streamColor } from "../../data/courses";
import { parseBulkTopics } from "../../hooks/useCourses";
import AccountChip from "./AccountChip";

interface Props {
  course: Course;
  onBack: () => void;
  accounts: UdemyAccount[];
  getSections: (courseId: number) => CourseSection[];
  getTopics: (sectionId: number) => CourseTopic[];
  getSessionsForCourse: (courseId: number) => CourseSession[];
  updateCourse: (id: number, patch: Partial<Course>) => void;
  assignAccount: (courseId: number, email: string | null) => void;
  addSection: (
    courseId: number,
    input: { title: string; totalLectures?: number; totalMinutes?: number }
  ) => number;
  addTopic: (
    sectionId: number,
    input: { title: string; durationMin?: number }
  ) => number;
  bulkAddTopics: (
    sectionId: number,
    items: { title: string; durationMin: number }[]
  ) => void;
  setTopicStatus: (topicId: number, status: TopicStatus) => void;
  updateTopic: (id: number, patch: Partial<CourseTopic>) => void;
  logSession: (
    courseId: number,
    topicId: number | null,
    minutes: number,
    notes?: string
  ) => void;
}

const TOPIC_STATUS_ORDER: TopicStatus[] = [
  "not_started",
  "in_progress",
  "completed",
  "skipped",
];
const TOPIC_STATUS_LABEL: Record<TopicStatus, string> = {
  not_started: "todo",
  in_progress: "wip",
  completed: "done",
  skipped: "skip",
};

function isoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

const PIE_COLORS: Record<TopicStatus, string> = {
  not_started: "#64748b",
  in_progress: "#f59e0b",
  completed: "#22c55e",
  skipped: "#94a3b8",
};

const UNASSIGNED = "__unassigned__";

export default function CourseDetail({
  course,
  onBack,
  accounts,
  getSections,
  getTopics,
  getSessionsForCourse,
  updateCourse,
  assignAccount,
  addSection,
  addTopic,
  bulkAddTopics,
  setTopicStatus,
  updateTopic,
  logSession,
}: Props) {
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [openSection, setOpenSection] = useState<number | null>(null);
  const [topicsBySection, setTopicsBySection] = useState<Record<number, CourseTopic[]>>({});
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [notes, setNotes] = useState(course.notes);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [bulkSectionId, setBulkSectionId] = useState<number | null>(null);
  const [bulkText, setBulkText] = useState("");

  // Refresh derived data when the course id/version changes.
  useEffect(() => {
    setNotes(course.notes);
    const s = getSections(course.id);
    setSections(s);
    if (openSection == null && s.length > 0) setOpenSection(s[0].id);
    const map: Record<number, CourseTopic[]> = {};
    for (const sec of s) map[sec.id] = getTopics(sec.id);
    setTopicsBySection(map);
    setSessions(getSessionsForCourse(course.id));
  }, [course.id, course.updatedAt, course.progressPct]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddSection = () => {
    const t = newSectionTitle.trim();
    if (!t) return;
    const id = addSection(course.id, { title: t });
    setNewSectionTitle("");
    setOpenSection(id);
  };

  const cycleStatus = (topic: CourseTopic) => {
    const i = TOPIC_STATUS_ORDER.indexOf(topic.status);
    const next = TOPIC_STATUS_ORDER[(i + 1) % TOPIC_STATUS_ORDER.length];
    setTopicStatus(topic.id, next);
  };

  const handleBulkAdd = () => {
    if (!bulkSectionId) return;
    const items = parseBulkTopics(bulkText);
    if (items.length === 0) return;
    bulkAddTopics(bulkSectionId, items);
    setBulkText("");
    setBulkSectionId(null);
  };

  // Charts data
  const sessionsByDay = useMemo(() => {
    const now = new Date();
    const days: { day: string; minutes: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const k = isoDate(d);
      const mins = sessions.filter((s) => s.date === k).reduce((s, x) => s + x.minutes, 0);
      days.push({ day: k.slice(5), minutes: mins });
    }
    return days;
  }, [sessions]);

  const topicPie = useMemo(() => {
    const counts: Record<TopicStatus, number> = {
      not_started: 0,
      in_progress: 0,
      completed: 0,
      skipped: 0,
    };
    for (const sec of sections) {
      for (const t of topicsBySection[sec.id] ?? []) counts[t.status] += 1;
    }
    return (Object.entries(counts) as [TopicStatus, number][])
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: k, value: v }));
  }, [sections, topicsBySection]);

  const ratingHistogram = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0];
    for (const sec of sections) {
      for (const t of topicsBySection[sec.id] ?? []) {
        if (t.rating && t.rating >= 1 && t.rating <= 5) buckets[t.rating - 1] += 1;
      }
    }
    return buckets.map((v, i) => ({ rating: `★${i + 1}`, count: v }));
  }, [sections, topicsBySection]);

  const totalTopics = topicPie.reduce((s, p) => s + p.value, 0);

  return (
    <div className="courses-view">
      <div className="row" style={{ gap: 10 }}>
        <button type="button" className="ghost" onClick={onBack} aria-label="Back to courses">← Courses</button>
      </div>
      <div className="course-detail">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="glass course-header">
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <span className="stream-tag" style={{ color: streamColor(course.stream) }}>
                {course.stream}
              </span>
              <span className={`priority-dot p${course.priority}`} title={`Priority ${course.priority}`} />
              <AccountChip
                account={accounts.find((a) => a.email === course.accountEmail)}
                email={course.accountEmail}
              />
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>{course.platform}</span>
              {course.url && (
                <a
                  href={course.url}
                  target="_blank"
                  rel="noopener"
                  style={{ fontSize: 12, color: "var(--accent)" }}
                  title={course.accountEmail
                    ? `Make sure you're signed in to Udemy as ${course.accountEmail}`
                    : "No account assigned — sign in to the right Udemy login"}
                  onClick={() => {
                    if (course.accountEmail) {
                      console.info(
                        `[Udemy] Open this in the browser session signed in as ${course.accountEmail}.`
                      );
                    }
                  }}
                >
                  Open on Udemy ↗
                </a>
              )}
            </div>
            <div className="title">{course.title}</div>
            <div className="meta-row">
              <span>Status: <strong>{course.status.replace("_", " ")}</strong></span>
              <span>Progress: <strong>{course.progressPct}%</strong></span>
              {course.targetDate && <span>Target: <strong>{course.targetDate}</strong></span>}
              {course.startedAt && <span>Started: <strong>{course.startedAt.slice(0, 10)}</strong></span>}
            </div>

            <div
              className="progress"
              role="progressbar"
              aria-valuenow={course.progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{ height: 8, background: "var(--bg-3)", borderRadius: 4, overflow: "hidden" }}
            >
              <div style={{
                width: `${course.progressPct}%`,
                height: "100%",
                background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
              }} />
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                if (notes !== course.notes) updateCourse(course.id, { notes });
              }}
              placeholder="Notes about this course…"
              style={{ minHeight: 80, width: "100%" }}
            />

            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <label style={{ fontSize: 12, color: "var(--text-3)" }}>
                Priority{" "}
                <select
                  value={course.priority}
                  onChange={(e) => updateCourse(course.id, { priority: Number(e.target.value) })}
                >
                  {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 12, color: "var(--text-3)" }}>
                Target{" "}
                <input
                  type="date"
                  value={course.targetDate ?? ""}
                  onChange={(e) => updateCourse(course.id, { targetDate: e.target.value || null })}
                />
              </label>
              <label style={{ fontSize: 12, color: "var(--text-3)" }}>
                Status{" "}
                <select
                  value={course.status}
                  onChange={(e) => updateCourse(course.id, { status: e.target.value as Course["status"] })}
                >
                  <option value="not_started">Not started</option>
                  <option value="in_progress">In progress</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="dropped">Dropped</option>
                </select>
              </label>
              <label style={{ fontSize: 12, color: "var(--text-3)" }}>
                Udemy account{" "}
                <select
                  value={course.accountEmail ?? UNASSIGNED}
                  onChange={(e) =>
                    assignAccount(course.id, e.target.value === UNASSIGNED ? null : e.target.value)
                  }
                >
                  <option value={UNASSIGNED}>— Unassigned —</option>
                  {accounts.map((a) => (
                    <option key={a.email} value={a.email}>
                      {a.displayName ? `${a.displayName} · ${a.email}` : a.email}
                      {a.isPrimary ? " (primary)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="glass" style={{ padding: 0 }}>
            <div className="section-title" style={{ padding: "14px 18px 0" }}>Curriculum</div>
            {sections.length === 0 && (
              <div className="muted" style={{ padding: "12px 18px", fontSize: 13 }}>
                No sections yet. Add one below to start tracking topics.
              </div>
            )}
            {sections.map((sec) => {
              const open = openSection === sec.id;
              const topics = topicsBySection[sec.id] ?? [];
              return (
                <div key={sec.id} className={`section-block ${open ? "open" : ""}`}>
                  <div
                    className="head"
                    onClick={() => setOpenSection(open ? null : sec.id)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={open}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpenSection(open ? null : sec.id);
                      }
                    }}
                  >
                    <span className="chev">▶</span>
                    <span className="name">{sec.title}</span>
                    <div className="progress-small">
                      <i style={{ width: `${sec.progressPct}%` }} />
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-3)", minWidth: 70, textAlign: "right" }}>
                      {topics.filter((t) => t.status === "completed").length}/{topics.length} · {sec.progressPct}%
                    </span>
                  </div>
                  {open && (
                    <div className="topics">
                      <TopicsList
                        topics={topics}
                        onCycle={cycleStatus}
                        onRate={(t, r) => updateTopic(t.id, { rating: r })}
                        onLog={(t, mins, note) => logSession(course.id, t.id, mins, note)}
                        onNotes={(t, n) => updateTopic(t.id, { notes: n })}
                      />
                      <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        <AddTopicInline
                          onAdd={(title, dur) => addTopic(sec.id, { title, durationMin: dur })}
                        />
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => setBulkSectionId(bulkSectionId === sec.id ? null : sec.id)}
                        >
                          {bulkSectionId === sec.id ? "Cancel bulk" : "Bulk add…"}
                        </button>
                      </div>
                      {bulkSectionId === sec.id && (
                        <div style={{ marginTop: 8 }}>
                          <textarea
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                            placeholder={"Paste lines like:\n01:23 Intro\n05:42 Setup\n12 Slides recap"}
                            style={{ width: "100%", minHeight: 100 }}
                          />
                          <div className="row" style={{ gap: 8, marginTop: 6, justifyContent: "flex-end" }}>
                            <span className="muted" style={{ fontSize: 11 }}>
                              {parseBulkTopics(bulkText).length} parsed
                            </span>
                            <button type="button" className="primary" onClick={handleBulkAdd}>
                              Add topics
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="section-block">
              <div className="row" style={{ gap: 8 }}>
                <input
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="New section title…"
                  style={{ flex: 1 }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddSection(); }}
                />
                <button type="button" className="primary" onClick={handleAddSection} disabled={!newSectionTitle.trim()}>
                  + Add section
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="detail-side">
          <SessionLogForm onLog={(mins, note) => logSession(course.id, null, mins, note)} />

          <div className="glass chart-card">
            <h4>Minutes · last 30 days</h4>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sessionsByDay}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--text-3)" fontSize={9} tickLine={false} axisLine={false} interval={4} />
                  <YAxis stroke="var(--text-3)" fontSize={10} allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "var(--bg-3)" }}
                    contentStyle={{
                      background: "var(--bg-1)",
                      border: "1px solid var(--border-hi)",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="minutes" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass chart-card">
            <h4>Topic status</h4>
            {totalTopics === 0 ? (
              <div className="muted" style={{ fontSize: 12 }}>No topics yet.</div>
            ) : (
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={topicPie} dataKey="value" nameKey="name" innerRadius={36} outerRadius={56}>
                      {topicPie.map((d) => (
                        <Cell key={d.name} fill={PIE_COLORS[d.name as TopicStatus]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg-1)",
                        border: "1px solid var(--border-hi)",
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="glass chart-card">
            <h4>Mastery ratings</h4>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingHistogram}>
                  <XAxis dataKey="rating" stroke="var(--text-3)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-3)" fontSize={10} allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-1)",
                      border: "1px solid var(--border-hi)",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="count" fill="var(--yellow)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

const VIRTUALIZE_THRESHOLD = 200;
const ROW_HEIGHT = 36;

function TopicsList({
  topics,
  onCycle,
  onRate,
  onLog,
  onNotes,
}: {
  topics: CourseTopic[];
  onCycle: (t: CourseTopic) => void;
  onRate: (t: CourseTopic, rating: number) => void;
  onLog: (t: CourseTopic, mins: number, note: string) => void;
  onNotes: (t: CourseTopic, notes: string) => void;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerH] = useState(420);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  if (topics.length <= VIRTUALIZE_THRESHOLD) {
    return (
      <div>
        {topics.map((t) => (
          <TopicRow
            key={t.id}
            topic={t}
            expanded={expanded.has(t.id)}
            onToggleExpand={() => {
              const next = new Set(expanded);
              if (next.has(t.id)) next.delete(t.id); else next.add(t.id);
              setExpanded(next);
            }}
            onCycle={() => onCycle(t)}
            onRate={(r) => onRate(t, r)}
            onLog={(m, n) => onLog(t, m, n)}
            onNotes={(n) => onNotes(t, n)}
          />
        ))}
      </div>
    );
  }
  // Windowed render for very large lists (e.g. imported courses with thousands of lectures).
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 5);
  const endIdx = Math.min(topics.length, Math.ceil((scrollTop + containerH) / ROW_HEIGHT) + 5);
  const visible = topics.slice(startIdx, endIdx);

  return (
    <div
      style={{ height: containerH, overflowY: "auto", position: "relative" }}
      onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      aria-label={`${topics.length} topics, virtualized`}
    >
      <div style={{ height: topics.length * ROW_HEIGHT, position: "relative" }}>
        <div style={{ position: "absolute", top: startIdx * ROW_HEIGHT, left: 0, right: 0 }}>
          {visible.map((t) => (
            <TopicRow
              key={t.id}
              topic={t}
              expanded={false}
              onToggleExpand={() => undefined}
              onCycle={() => onCycle(t)}
              onRate={(r) => onRate(t, r)}
              onLog={(m, n) => onLog(t, m, n)}
              onNotes={(n) => onNotes(t, n)}
              compact
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TopicRow({
  topic,
  expanded,
  onToggleExpand,
  onCycle,
  onRate,
  onLog,
  onNotes,
  compact,
}: {
  topic: CourseTopic;
  expanded: boolean;
  onToggleExpand: () => void;
  onCycle: () => void;
  onRate: (r: number) => void;
  onLog: (m: number, n: string) => void;
  onNotes: (n: string) => void;
  compact?: boolean;
}) {
  return (
    <>
      <div className="topic-row-c" style={compact ? { height: ROW_HEIGHT } : undefined}>
        <span className="order">#{topic.orderIndex}</span>
        <span className="title-c" onClick={onToggleExpand} style={{ cursor: "pointer" }}>
          {topic.title}
        </span>
        <span className="dur">{topic.durationMin}m</span>
        <button
          type="button"
          className={`topic-status s-${topic.status}`}
          onClick={onCycle}
          aria-label={`Topic status ${topic.status}, click to cycle`}
        >
          {TOPIC_STATUS_LABEL[topic.status]}
        </button>
        <span className="stars" role="group" aria-label="Mastery rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={topic.rating && topic.rating >= n ? "on" : ""}
              onClick={() => onRate(topic.rating === n ? 0 : n)}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
            >★</button>
          ))}
        </span>
      </div>
      {expanded && !compact && (
        <div style={{ padding: "6px 8px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          <LogTopicInline onLog={onLog} />
          <textarea
            value={topic.notes}
            onChange={(e) => onNotes(e.target.value)}
            placeholder="Notes for this topic…"
            style={{ minHeight: 60, width: "100%" }}
          />
        </div>
      )}
    </>
  );
}

function AddTopicInline({ onAdd }: { onAdd: (title: string, durationMin: number) => void }) {
  const [t, setT] = useState("");
  const [d, setD] = useState(0);
  return (
    <div className="row" style={{ gap: 6 }}>
      <input
        value={t}
        onChange={(e) => setT(e.target.value)}
        placeholder="Add topic title…"
        style={{ flex: 1, minWidth: 180 }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && t.trim()) {
            onAdd(t.trim(), d);
            setT(""); setD(0);
          }
        }}
      />
      <input
        type="number"
        min={0}
        value={d}
        onChange={(e) => setD(Number(e.target.value))}
        style={{ width: 64 }}
        aria-label="Duration in minutes"
      />
      <button
        type="button"
        className="ghost"
        onClick={() => { if (t.trim()) { onAdd(t.trim(), d); setT(""); setD(0); } }}
        disabled={!t.trim()}
      >
        + Topic
      </button>
    </div>
  );
}

function LogTopicInline({ onLog }: { onLog: (m: number, n: string) => void }) {
  const [m, setM] = useState(10);
  const [n, setN] = useState("");
  return (
    <div className="row" style={{ gap: 6 }}>
      <input
        type="number"
        min={1}
        value={m}
        onChange={(e) => setM(Number(e.target.value))}
        style={{ width: 64 }}
        aria-label="Minutes"
      />
      <input
        value={n}
        onChange={(e) => setN(e.target.value)}
        placeholder="Note (optional)…"
        style={{ flex: 1 }}
      />
      <button type="button" className="primary" onClick={() => { if (m > 0) { onLog(m, n); setN(""); } }}>
        Log
      </button>
    </div>
  );
}

function SessionLogForm({ onLog }: { onLog: (m: number, n: string) => void }) {
  const [m, setM] = useState(25);
  const [n, setN] = useState("");
  return (
    <div className="glass" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
      <h4 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-2)" }}>
        Log a session
      </h4>
      <div className="row" style={{ gap: 6 }}>
        <input
          type="number"
          min={1}
          value={m}
          onChange={(e) => setM(Number(e.target.value))}
          style={{ width: 80 }}
          aria-label="Minutes"
        />
        <input
          value={n}
          onChange={(e) => setN(e.target.value)}
          placeholder="What did you cover?"
          style={{ flex: 1 }}
        />
      </div>
      <button
        type="button"
        className="primary"
        onClick={() => { if (m > 0) { onLog(m, n); setN(""); } }}
      >
        Log {m}m
      </button>
    </div>
  );
}
