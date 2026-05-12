import { useEffect, useMemo, useState } from "react";
import type { Course, CourseSession, CourseStatus, UdemyAccount } from "../../types";
import { streamColor } from "../../data/courses";
import StreamHeatmap from "./StreamHeatmap";
import AddCourseDialog from "./AddCourseDialog";
import CourseImport from "./CourseImport";
import BulkAssignAccount from "./BulkAssignAccount";
import AccountChip, { AccountAvatar } from "./AccountChip";
import { getMeta, setMeta } from "../../lib/db";

interface Props {
  courses: Course[];
  sessions: CourseSession[];
  accounts: UdemyAccount[];
  onOpenCourse: (id: number) => void;
  onCreateCourse: (input: Partial<Course> & { title: string; stream: string }) => void;
  onImportCourses: (rows: Array<Partial<Course> & { title: string; stream: string }>) => void;
  onBulkAssign: (courseIds: number[], email: string | null) => void;
  onAddAccount: (email: string) => void;
  // External pre-applied filter — set when the user deep-links from Accounts view.
  initialAccountFilter?: string | null;
  onConsumeInitialFilter?: () => void;
}

const STATUS_LABEL: Record<CourseStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  paused: "Paused",
  completed: "Completed",
  dropped: "Dropped",
};

type SortKey = "updated" | "progress_asc" | "progress_desc" | "title" | "target";
type GroupBy = "none" | "account" | "stream";
const UNASSIGNED_KEY = "__unassigned__";

function isoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function weekStartIso(d: Date = new Date()): string {
  const out = new Date(d);
  const day = out.getDay();
  const diff = (day + 6) % 7;
  out.setDate(out.getDate() - diff);
  return isoDate(out);
}

// Filters are persisted in the `meta` SQLite table under this key.
const FILTERS_META_KEY = "courses_filters_v1";

interface PersistedFilters {
  search: string;
  streamFilter: string[];
  statusFilter: CourseStatus[];
  priorityFilter: number[];
  accountFilter: string[];        // includes UNASSIGNED_KEY for "Unassigned"
  sort: SortKey;
  groupBy: GroupBy;
}

function loadFilters(): PersistedFilters {
  try {
    const raw = getMeta(FILTERS_META_KEY);
    if (!raw) return defaultFilters();
    const parsed = JSON.parse(raw) as Partial<PersistedFilters>;
    return {
      search: parsed.search ?? "",
      streamFilter: parsed.streamFilter ?? [],
      statusFilter: parsed.statusFilter ?? [],
      priorityFilter: parsed.priorityFilter ?? [],
      accountFilter: parsed.accountFilter ?? [],
      sort: (parsed.sort as SortKey) ?? "updated",
      groupBy: (parsed.groupBy as GroupBy) ?? "none",
    };
  } catch {
    return defaultFilters();
  }
}

function defaultFilters(): PersistedFilters {
  return {
    search: "",
    streamFilter: [],
    statusFilter: [],
    priorityFilter: [],
    accountFilter: [],
    sort: "updated",
    groupBy: "none",
  };
}

export default function CoursesList({
  courses,
  sessions,
  accounts,
  onOpenCourse,
  onCreateCourse,
  onImportCourses,
  onBulkAssign,
  onAddAccount,
  initialAccountFilter,
  onConsumeInitialFilter,
}: Props) {
  const initial = useMemo(loadFilters, []);
  const [search, setSearch] = useState(initial.search);
  const [streamFilter, setStreamFilter] = useState<Set<string>>(new Set(initial.streamFilter));
  const [statusFilter, setStatusFilter] = useState<Set<CourseStatus>>(new Set(initial.statusFilter));
  const [priorityFilter, setPriorityFilter] = useState<Set<number>>(new Set(initial.priorityFilter));
  const [accountFilter, setAccountFilter] = useState<Set<string>>(new Set(initial.accountFilter));
  const [sort, setSort] = useState<SortKey>(initial.sort);
  const [groupBy, setGroupBy] = useState<GroupBy>(initial.groupBy);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Apply a deep-link account filter once.
  useEffect(() => {
    if (initialAccountFilter !== undefined && initialAccountFilter !== null) {
      setAccountFilter(new Set([initialAccountFilter]));
      onConsumeInitialFilter?.();
    } else if (initialAccountFilter === null) {
      // Explicit "Unassigned" deep link.
      setAccountFilter(new Set([UNASSIGNED_KEY]));
      onConsumeInitialFilter?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAccountFilter]);

  // Persist filters whenever they change.
  useEffect(() => {
    const payload: PersistedFilters = {
      search,
      streamFilter: [...streamFilter],
      statusFilter: [...statusFilter],
      priorityFilter: [...priorityFilter],
      accountFilter: [...accountFilter],
      sort,
      groupBy,
    };
    setMeta(FILTERS_META_KEY, JSON.stringify(payload));
  }, [search, streamFilter, statusFilter, priorityFilter, accountFilter, sort, groupBy]);

  // KPIs
  const kpis = useMemo(() => {
    const total = courses.length;
    const completed = courses.filter((c) => c.status === "completed").length;
    const inProgress = courses.filter((c) => c.status === "in_progress").length;
    const avgProgress =
      total > 0
        ? Math.round(courses.reduce((s, c) => s + c.progressPct, 0) / total)
        : 0;
    const thisWeekStart = weekStartIso();
    const minsThisWeek = sessions
      .filter((s) => s.date >= thisWeekStart)
      .reduce((s, x) => s + x.minutes, 0);

    let streak = 0;
    const days = new Set(sessions.map((s) => s.date));
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const k = isoDate(d);
      if (days.has(k)) streak += 1;
      else if (i > 0) break;
    }

    const unassignedCount = courses.filter((c) => !c.accountEmail).length;

    return { total, completed, inProgress, avgProgress, minsThisWeek, streak, unassignedCount };
  }, [courses, sessions]);

  // Stream + account counts for chips
  const streamCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of courses) m.set(c.stream, (m.get(c.stream) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [courses]);

  const accountCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of courses) {
      const k = c.accountEmail ?? UNASSIGNED_KEY;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [courses]);

  // Per-account summary
  const accountSummary = useMemo(() => {
    const thisWeekStart = weekStartIso();
    return accounts.map((a) => {
      const list = courses.filter((c) => c.accountEmail === a.email);
      const minsThisWeek = sessions
        .filter((s) => s.date >= thisWeekStart && list.some((c) => c.id === s.courseId))
        .reduce((s, x) => s + x.minutes, 0);
      const avg = list.length > 0
        ? Math.round(list.reduce((s, c) => s + c.progressPct, 0) / list.length)
        : 0;
      return { account: a, courseCount: list.length, avgProgress: avg, minsThisWeek };
    });
  }, [accounts, courses, sessions]);

  const lastSessionByCourse = useMemo(() => {
    const m = new Map<number, string>();
    for (const s of sessions) {
      const cur = m.get(s.courseId);
      if (!cur || s.date > cur) m.set(s.courseId, s.date);
    }
    return m;
  }, [sessions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = courses.filter((c) => {
      if (streamFilter.size > 0 && !streamFilter.has(c.stream)) return false;
      if (statusFilter.size > 0 && !statusFilter.has(c.status)) return false;
      if (priorityFilter.size > 0 && !priorityFilter.has(c.priority)) return false;
      if (accountFilter.size > 0) {
        const k = c.accountEmail ?? UNASSIGNED_KEY;
        if (!accountFilter.has(k)) return false;
      }
      if (q && !c.title.toLowerCase().includes(q) && !c.stream.toLowerCase().includes(q)) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case "progress_asc": return a.progressPct - b.progressPct;
        case "progress_desc": return b.progressPct - a.progressPct;
        case "title": return a.title.localeCompare(b.title);
        case "target": {
          const at = a.targetDate ?? "9999-12-31";
          const bt = b.targetDate ?? "9999-12-31";
          return at.localeCompare(bt);
        }
        case "updated":
        default:
          return b.updatedAt.localeCompare(a.updatedAt);
      }
    });
    return rows;
  }, [courses, search, streamFilter, statusFilter, priorityFilter, accountFilter, sort]);

  // Grouping
  const grouped = useMemo(() => {
    if (groupBy === "none") return null;
    const map = new Map<string, Course[]>();
    for (const c of filtered) {
      const key = groupBy === "account" ? (c.accountEmail ?? UNASSIGNED_KEY) : c.stream;
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    // Sort groups: largest first, unassigned last.
    return [...map.entries()].sort((a, b) => {
      if (a[0] === UNASSIGNED_KEY) return 1;
      if (b[0] === UNASSIGNED_KEY) return -1;
      return b[1].length - a[1].length;
    });
  }, [filtered, groupBy]);

  const toggleSet = <T,>(set: Set<T>, v: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v); else next.add(v);
    setter(next);
  };

  const toggleSelection = (id: number) => {
    const next = new Set(selection);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelection(next);
  };

  const selectAllFiltered = () => setSelection(new Set(filtered.map((c) => c.id)));
  const clearSelection = () => setSelection(new Set());

  const handleHeatmapClick = (stream: string, weekStart: string) => {
    if (streamFilter.size === 1 && streamFilter.has(stream) && selectedWeek === weekStart) {
      setStreamFilter(new Set());
      setSelectedWeek(null);
    } else {
      setStreamFilter(new Set([stream]));
      setSelectedWeek(weekStart);
    }
  };

  const accountByEmail = useMemo(() => {
    const m = new Map<string, UdemyAccount>();
    for (const a of accounts) m.set(a.email, a);
    return m;
  }, [accounts]);

  const selectedCourses = useMemo(
    () => courses.filter((c) => selection.has(c.id)),
    [courses, selection]
  );

  const renderCardGrid = (rows: Course[]) => (
    <div className="course-grid">
      {rows.map((c) => (
        <CourseCard
          key={c.id}
          course={c}
          account={c.accountEmail ? accountByEmail.get(c.accountEmail) : undefined}
          lastSession={lastSessionByCourse.get(c.id)}
          selected={selection.has(c.id)}
          onToggleSelect={() => toggleSelection(c.id)}
          onOpen={() => onOpenCourse(c.id)}
          onAccountChipClick={() => {
            const key = c.accountEmail ?? UNASSIGNED_KEY;
            setAccountFilter(new Set([key]));
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="courses-view">
      <div className="courses-kpi-strip">
        <div className="glass kpi-tile accent">
          <div className="label">Courses</div>
          <div className="value">{kpis.total}</div>
          <div className="sub">{kpis.inProgress} in progress</div>
        </div>
        <div className="glass kpi-tile">
          <div className="label">Completed</div>
          <div className="value" style={{ color: "var(--green)" }}>{kpis.completed}</div>
          <div className="sub">{kpis.total ? Math.round((kpis.completed / kpis.total) * 100) : 0}% of catalog</div>
        </div>
        <div className="glass kpi-tile">
          <div className="label">Avg progress</div>
          <div className="value">{kpis.avgProgress}%</div>
          <div className="sub">across all courses</div>
        </div>
        <div className="glass kpi-tile">
          <div className="label">This week</div>
          <div className="value" style={{ color: "var(--accent)" }}>{kpis.minsThisWeek}m</div>
          <div className="sub">minutes logged</div>
        </div>
        <div className="glass kpi-tile">
          <div className="label">Streak</div>
          <div className="value" style={{ color: "var(--yellow)" }}>{kpis.streak}d</div>
          <div className="sub">consecutive days</div>
        </div>
        <div className="glass kpi-tile">
          <div className="label">Unassigned</div>
          <div className="value" style={{ color: kpis.unassignedCount > 0 ? "var(--red)" : "var(--green)" }}>
            {kpis.unassignedCount}
          </div>
          <div className="sub">need a Udemy account</div>
        </div>
      </div>

      {kpis.unassignedCount > 0 && (
        <div className="unassigned-banner">
          <span className="icon">⚠️</span>
          <div style={{ flex: 1 }}>
            <strong>{kpis.unassignedCount} course{kpis.unassignedCount === 1 ? "" : "s"}</strong>{" "}
            don't have a Udemy account assigned yet.
          </div>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setSelection(new Set(courses.filter((c) => !c.accountEmail).map((c) => c.id)));
              setBulkOpen(true);
            }}
          >
            Bulk assign
          </button>
        </div>
      )}

      <div className="account-summary-row">
        {accountSummary.map(({ account, courseCount, avgProgress, minsThisWeek }) => (
          <div
            key={account.email}
            className="glass account-summary-card"
            role="button"
            tabIndex={0}
            onClick={() => setAccountFilter(new Set([account.email]))}
            onKeyDown={(e) => { if (e.key === "Enter") setAccountFilter(new Set([account.email])); }}
          >
            <AccountAvatar account={account} size="lg" />
            <div className="meta">
              <div className="name">{account.displayName || account.email.split("@")[0]}</div>
              <div className="email">{account.email}</div>
              <div className="stat-line">
                <span>{courseCount} course{courseCount === 1 ? "" : "s"}</span>
                <span>· {avgProgress}% avg</span>
                <span>· {minsThisWeek}m this week</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass courses-toolbar">
        <input
          className="grow"
          placeholder="Search course title or stream…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="updated">Recently updated</option>
          <option value="progress_desc">Progress · high to low</option>
          <option value="progress_asc">Progress · low to high</option>
          <option value="title">Title (A→Z)</option>
          <option value="target">Target date</option>
        </select>
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}>
          <option value="none">No grouping</option>
          <option value="account">Group by account</option>
          <option value="stream">Group by stream</option>
        </select>
        <button type="button" className="primary" onClick={() => setAddOpen(true)}>+ Add course</button>
        <button type="button" className="ghost" onClick={() => setImportOpen(true)}>⬆ Import</button>
      </div>

      <div className="glass" style={{ padding: 14 }}>
        <div className="section-title" style={{ marginBottom: 8 }}>Udemy accounts</div>
        <div className="pill-group" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {accounts.map((a) => {
            const n = accountCounts.get(a.email) ?? 0;
            const active = accountFilter.has(a.email);
            return (
              <button
                type="button"
                key={a.email}
                className={`pill ${active ? "active" : ""}`}
                style={active ? undefined : { color: a.color, borderColor: a.color }}
                onClick={() => toggleSet(accountFilter, a.email, setAccountFilter)}
                aria-pressed={active}
              >
                <AccountAvatar account={a} size="xs" />{" "}
                {a.displayName || a.email.split("@")[0]} <span style={{ opacity: 0.7 }}>· {n}</span>
              </button>
            );
          })}
          {kpis.unassignedCount > 0 && (
            <button
              type="button"
              className={`pill ${accountFilter.has(UNASSIGNED_KEY) ? "active" : ""}`}
              onClick={() => toggleSet(accountFilter, UNASSIGNED_KEY, setAccountFilter)}
              aria-pressed={accountFilter.has(UNASSIGNED_KEY)}
              style={{ borderStyle: "dashed" }}
            >
              Unassigned <span style={{ opacity: 0.7 }}>· {kpis.unassignedCount}</span>
            </button>
          )}
        </div>

        <div className="section-title" style={{ marginBottom: 8, marginTop: 14 }}>Streams</div>
        <div className="pill-group" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {streamCounts.map(([s, n]) => (
            <button
              type="button"
              key={s}
              className={`pill ${streamFilter.has(s) ? "active" : ""}`}
              style={
                streamFilter.has(s)
                  ? undefined
                  : { color: streamColor(s), borderColor: streamColor(s) }
              }
              onClick={() => toggleSet(streamFilter, s, setStreamFilter)}
              aria-pressed={streamFilter.has(s)}
            >
              {s} <span style={{ opacity: 0.7 }}>· {n}</span>
            </button>
          ))}
        </div>

        <div className="section-title" style={{ marginBottom: 8, marginTop: 14 }}>Status</div>
        <div className="pill-group" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(["not_started", "in_progress", "paused", "completed", "dropped"] as CourseStatus[]).map((s) => (
            <button
              type="button"
              key={s}
              className={`pill ${statusFilter.has(s) ? "active" : ""}`}
              onClick={() => toggleSet(statusFilter, s, setStatusFilter)}
              aria-pressed={statusFilter.has(s)}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="section-title" style={{ marginBottom: 8, marginTop: 14 }}>Priority</div>
        <div className="pill-group" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[1, 2, 3, 4, 5].map((p) => (
            <button
              type="button"
              key={p}
              className={`pill ${priorityFilter.has(p) ? "active" : ""}`}
              onClick={() => toggleSet(priorityFilter, p, setPriorityFilter)}
              aria-pressed={priorityFilter.has(p)}
            >
              <span className={`priority-dot p${p}`} style={{ marginRight: 6 }} />
              P{p}
            </button>
          ))}
        </div>
      </div>

      <div className="glass" style={{ padding: 14 }}>
        <div className="section-title" style={{ marginBottom: 8 }}>Stream activity · last 12 weeks</div>
        <StreamHeatmap
          courses={courses}
          sessions={sessions}
          selectedStream={streamFilter.size === 1 ? [...streamFilter][0] : null}
          selectedWeek={selectedWeek}
          onCellClick={handleHeatmapClick}
        />
      </div>

      <div className="row" style={{ fontSize: 12, color: "var(--text-3)", gap: 12, flexWrap: "wrap" }}>
        <span>Showing {filtered.length} of {courses.length} courses</span>
        <div style={{ flex: 1 }} />
        {selection.size > 0 ? (
          <>
            <span><strong>{selection.size}</strong> selected</span>
            <button type="button" className="ghost" onClick={clearSelection}>Clear</button>
            <button type="button" className="primary" onClick={() => setBulkOpen(true)}>
              Assign account…
            </button>
          </>
        ) : (
          filtered.length > 0 && (
            <button type="button" className="ghost" onClick={selectAllFiltered}>
              Select all filtered
            </button>
          )
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="glass empty-courses">
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div>No courses match these filters.</div>
        </div>
      ) : grouped ? (
        <div>
          {grouped.map(([key, rows]) => {
            const isOpen = !collapsedGroups.has(key);
            const headerEl =
              groupBy === "account" ? (
                key === UNASSIGNED_KEY ? (
                  <AccountChip />
                ) : (
                  <AccountChip account={accountByEmail.get(key)} email={key} />
                )
              ) : (
                <span className="stream-tag" style={{ color: streamColor(key) }}>{key}</span>
              );
            const avgPct = rows.length
              ? Math.round(rows.reduce((s, c) => s + c.progressPct, 0) / rows.length)
              : 0;
            return (
              <div key={key}>
                <div
                  className={`group-header ${isOpen ? "open" : ""}`}
                  onClick={() => {
                    const next = new Set(collapsedGroups);
                    if (next.has(key)) next.delete(key); else next.add(key);
                    setCollapsedGroups(next);
                  }}
                  role="button"
                  aria-expanded={isOpen}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") {
                    const next = new Set(collapsedGroups);
                    if (next.has(key)) next.delete(key); else next.add(key);
                    setCollapsedGroups(next);
                  }}}
                >
                  <span className="chev">▶</span>
                  {headerEl}
                  <strong>{rows.length}</strong>
                  <span className="stat">avg {avgPct}%</span>
                  <span className="stat">{rows.filter((c) => c.status === "completed").length} completed</span>
                </div>
                {isOpen && <div style={{ marginTop: 10 }}>{renderCardGrid(rows)}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        renderCardGrid(filtered)
      )}

      <AddCourseDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={onCreateCourse}
        accounts={accounts}
      />
      <CourseImport
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={onImportCourses}
        accounts={accounts}
        onAddAccount={onAddAccount}
      />
      <BulkAssignAccount
        open={bulkOpen}
        onClose={() => { setBulkOpen(false); }}
        courses={selectedCourses.length > 0 ? selectedCourses : courses.filter((c) => !c.accountEmail)}
        accounts={accounts}
        onAssign={(ids, email) => {
          onBulkAssign(ids, email);
          setSelection(new Set());
        }}
      />
    </div>
  );
}

function CourseCard({
  course,
  account,
  lastSession,
  selected,
  onToggleSelect,
  onOpen,
  onAccountChipClick,
}: {
  course: Course;
  account: UdemyAccount | undefined;
  lastSession: string | undefined;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onAccountChipClick: () => void;
}) {
  const isCompleted = course.status === "completed";
  const pct = Math.max(0, Math.min(100, course.progressPct));
  return (
    <div
      className={`glass course-card ${isCompleted ? "completed" : ""}`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(); }}
      aria-label={`${course.title}, ${pct} percent complete`}
      style={{ position: "relative" }}
    >
      <span
        className={`select-checkbox ${selected ? "on" : ""}`}
        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
        role="checkbox"
        aria-checked={selected}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.stopPropagation();
            e.preventDefault();
            onToggleSelect();
          }
        }}
        title={selected ? "Selected" : "Select for bulk action"}
      >
        ✓
      </span>

      <div className="row-1">
        <span
          className="stream-tag"
          style={{ color: streamColor(course.stream) }}
        >
          {course.stream}
        </span>
        <span className={`priority-dot p${course.priority}`} title={`Priority ${course.priority}`} />
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-3)" }}>{course.platform}</span>
      </div>

      <div onClick={(e) => { e.stopPropagation(); onAccountChipClick(); }}>
        <AccountChip account={account} email={course.accountEmail} compact />
      </div>

      <div className="title">{course.title}</div>
      <div
        className="progress"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <i style={{ width: `${pct}%` }} />
      </div>
      <div className="meta">
        <span>{pct}%</span>
        <span>{lastSession ? `Last: ${lastSession}` : "No sessions yet"}</span>
      </div>
      <button
        type="button"
        className={isCompleted ? "ghost" : "primary"}
        onClick={(e) => { e.stopPropagation(); onOpen(); }}
        style={{ alignSelf: "stretch" }}
      >
        {isCompleted ? "Open" : course.status === "in_progress" ? "Continue" : "Start"}
      </button>
    </div>
  );
}
