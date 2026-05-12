import { useEffect, useMemo, useRef, useState } from "react";
import type { View } from "./types";
import { QUESTIONS } from "./data/questions";
import { useProgress } from "./hooks/useProgress";
import { useCourses } from "./hooks/useCourses";
import { useAccounts } from "./hooks/useAccounts";
import { useTheme } from "./hooks/useTheme";
import { usePomodoro } from "./hooks/usePomodoro";
import { useToasts } from "./hooks/useToasts";
import Dashboard from "./components/Dashboard";
import Browse from "./components/Browse";
import Flashcards from "./components/Flashcards";
import CommandPalette from "./components/CommandPalette";
import CoursesList from "./components/courses/CoursesList";
import CourseDetail from "./components/courses/CourseDetail";
import AccountsView from "./components/courses/AccountsView";
import { AccountAvatar } from "./components/courses/AccountChip";
import ToastHost from "./components/ToastHost";
import ThemeSwitcher from "./components/ThemeSwitcher";
import Pomodoro from "./components/Pomodoro";
import LoadingScreen from "./components/LoadingScreen";
import { isDue } from "./lib/sm2";
import type { Achievement } from "./lib/achievements";
import { detectCourseAchievements } from "./lib/achievements";
import { getMeta, setMeta } from "./lib/db";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [forcedTopic, setForcedTopic] = useState<string | null>(null);
  const [forcedQuestionId, setForcedQuestionId] = useState<number | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<number | null>(null);
  const [pendingAccountFilter, setPendingAccountFilter] = useState<string | null | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  const { theme, setTheme } = useTheme();
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

  const onAchievement = (a: Achievement) => {
    pushToast({ icon: a.icon, title: a.title, body: a.body });
  };

  const progress = useProgress(onAchievement);
  const courses = useCourses();
  const accountsApi = useAccounts();

  // Restore last opened course id from meta.
  useEffect(() => {
    if (!courses.ready) return;
    const v = getMeta("last_open_course_id");
    if (v) {
      const id = Number(v);
      if (!Number.isNaN(id) && id > 0) setActiveCourseId(id);
    }
  }, [courses.ready]);

  // Course-related achievement detection.
  useEffect(() => {
    if (!courses.ready) return;
    const fired = detectCourseAchievements(courses.courses, courses.sessions);
    fired.forEach((a) => onAchievement(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses.courses, courses.sessions, courses.ready]);

  const onPomodoroComplete = (mode: "focus" | "break") => {
    pushToast({
      icon: mode === "focus" ? "🍅" : "☕",
      title: mode === "focus" ? "Focus session done!" : "Break's over",
      body: mode === "focus" ? "Take a 5-minute break — you earned it." : "Time to dive back in.",
    });
    if (mode === "focus" && activeCourseId) {
      const c = courses.getCourseById(activeCourseId);
      if (c) {
        pushToast({
          icon: "📚",
          title: `Log 25m to "${c.title}"?`,
          body: "Tap below to record this focus block as a study session.",
          action: {
            label: "Log 25m",
            onClick: () => courses.logSession(c.id, null, 25, "Pomodoro focus block"),
          },
        });
      }
    }
  };

  const pomo = usePomodoro(onPomodoroComplete);

  const dueCount = useMemo(() => {
    if (!progress.ready) return 0;
    const now = new Date();
    return QUESTIONS.filter((q) => isDue(progress.state.progress[q.id], now)).length;
  }, [progress.state, progress.ready]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField =
        e.target instanceof HTMLElement &&
        (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (inField) return;
      if (e.key === "1") setView("dashboard");
      else if (e.key === "2") setView("browse");
      else if (e.key === "3") setView("flashcards");
      else if (e.key === "4") setView("review");
      else if (e.key === "5") {
        if (e.shiftKey) {
          if (activeCourseId) setView("course-detail");
        } else {
          setView("courses");
        }
      }
      else if (e.key === "6") setView("accounts");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeCourseId]);

  const onPaletteSelect = (sel:
    | { kind: "question"; id: number }
    | { kind: "course"; id: number }
    | { kind: "account"; email: string }
  ) => {
    if (sel.kind === "question") {
      setForcedQuestionId(sel.id);
      setView("browse");
    } else if (sel.kind === "course") {
      openCourse(sel.id);
    } else if (sel.kind === "account") {
      jumpToCoursesForAccount(sel.email);
    }
  };
  const onJumpToTopic = (topic: string) => {
    setForcedTopic(topic);
    setView("browse");
  };

  const openCourse = (id: number) => {
    setActiveCourseId(id);
    setMeta("last_open_course_id", String(id));
    setView("course-detail");
  };

  const jumpToCoursesForAccount = (email: string) => {
    setPendingAccountFilter(email);
    setView("courses");
  };

  if (!progress.ready || !courses.ready || !accountsApi.ready) {
    return (
      <>
        <div className="mesh-bg" />
        <LoadingScreen />
      </>
    );
  }

  const activeCourse = activeCourseId ? courses.getCourseById(activeCourseId) : undefined;

  return (
    <>
      <div className="mesh-bg" />
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <div className="brand-icon">🎯</div>
            <div>
              <h1>.NET Interview Tracker</h1>
              <div className="sub">
                {QUESTIONS.length} questions · {courses.courses.length} courses · {accountsApi.accounts.length} accounts
              </div>
            </div>
          </div>

          <nav>
            <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>
              Dashboard
            </button>
            <button className={view === "browse" ? "active" : ""} onClick={() => setView("browse")}>
              Browse
            </button>
            <button
              className={view === "courses" || view === "course-detail" ? "active" : ""}
              onClick={() => setView("courses")}
            >
              Courses
            </button>
            <button className={view === "flashcards" ? "active" : ""} onClick={() => setView("flashcards")}>
              Flashcards
            </button>
            <button className={view === "review" ? "active" : ""} onClick={() => setView("review")}>
              Review {dueCount > 0 && <span className="badge">{dueCount}</span>}
            </button>
          </nav>

          <div className="actions">
            <button
              className={`ghost ${view === "accounts" ? "active" : ""}`}
              onClick={() => setView("accounts")}
              title="Manage Udemy accounts"
              aria-label="Accounts"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px" }}
            >
              <span className="avatar-stack" aria-hidden>
                {accountsApi.accounts.slice(0, 5).map((a) => (
                  <AccountAvatar key={a.email} account={a} size="xs" />
                ))}
              </span>
              <span style={{ fontSize: 12 }}>Accounts</span>
            </button>
            <button
              className="ghost"
              onClick={() => setPaletteOpen(true)}
              title="Search · ⌘K"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px" }}
            >
              <span>⌕</span>
              <span style={{ color: "var(--text-3)" }}>Search</span>
              <span className="kbd">⌘K</span>
            </button>
            <Pomodoro
              mode={pomo.mode}
              time={pomo.time}
              start={pomo.start}
              pause={pomo.pause}
              reset={pomo.reset}
              skip={pomo.skip}
            />
            <ThemeSwitcher theme={theme} setTheme={setTheme} />
            <button className="ghost" onClick={progress.exportSqlite} title="Download .sqlite database file">⬇ .sqlite</button>
            <button className="ghost" onClick={() => fileRef.current?.click()} title="Import .sqlite file">⬆</button>
            <input
              ref={fileRef}
              type="file"
              accept=".sqlite,.db,application/x-sqlite3,application/octet-stream"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  progress
                    .importSqlite(f)
                    .then(() => {
                      courses.reload();
                      accountsApi.reload();
                    })
                    .catch((err) => alert("Import failed: " + err.message));
                }
                e.target.value = "";
              }}
            />
            <button className="ghost" onClick={progress.reset} title="Reset progress (wipes SQLite DB)">⟲</button>
          </div>
        </header>

        <main className="view">
          {view === "dashboard" && (
            <Dashboard
              state={progress.state}
              onJumpToTopic={onJumpToTopic}
              dbStats={progress.stats}
              courses={courses.courses}
              courseSessions={courses.sessions}
              udemyAccounts={accountsApi.accounts}
              onJumpToCourse={openCourse}
              onJumpToAccount={jumpToCoursesForAccount}
            />
          )}
          {view === "browse" && (
            <Browse
              state={progress.state}
              setStatus={progress.setStatus}
              setNotes={progress.setNotes}
              forcedTopic={forcedTopic}
              forcedQuestionId={forcedQuestionId}
            />
          )}
          {view === "flashcards" && (
            <Flashcards state={progress.state} rate={progress.rate} mode="all" />
          )}
          {view === "review" && (
            <Flashcards state={progress.state} rate={progress.rate} mode="review" />
          )}
          {view === "courses" && (
            <CoursesList
              courses={courses.courses}
              sessions={courses.sessions}
              accounts={accountsApi.accounts}
              onOpenCourse={openCourse}
              onCreateCourse={(input) => {
                const id = courses.createCourse(input);
                if (id) openCourse(id);
              }}
              onImportCourses={(rows) => {
                for (const r of rows) courses.createCourse(r);
              }}
              onBulkAssign={(ids, email) => courses.bulkAssignAccount(ids, email)}
              onAddAccount={(email) => accountsApi.addAccount({ email })}
              initialAccountFilter={pendingAccountFilter}
              onConsumeInitialFilter={() => setPendingAccountFilter(undefined)}
            />
          )}
          {view === "course-detail" && activeCourse && (
            <CourseDetail
              course={activeCourse}
              accounts={accountsApi.accounts}
              onBack={() => setView("courses")}
              getSections={courses.getSections}
              getTopics={courses.getTopics}
              getSessionsForCourse={courses.getSessionsForCourse}
              updateCourse={courses.updateCourse}
              assignAccount={courses.assignAccount}
              addSection={courses.addSection}
              addTopic={courses.addTopic}
              bulkAddTopics={courses.bulkAddTopics}
              setTopicStatus={courses.setTopicStatus}
              updateTopic={courses.updateTopic}
              logSession={courses.logSession}
            />
          )}
          {view === "course-detail" && !activeCourse && (
            <div className="empty"><div className="icon">📚</div><h3>Pick a course</h3>
              <button className="primary" onClick={() => setView("courses")}>Go to Courses</button>
            </div>
          )}
          {view === "accounts" && (
            <AccountsView
              accounts={accountsApi.accounts}
              courses={courses.courses}
              sessions={courses.sessions}
              onAddAccount={(input) => { accountsApi.addAccount(input); }}
              onUpdateAccount={accountsApi.updateAccount}
              onSetPrimary={accountsApi.setPrimary}
              onDeleteAccount={(id, reassignTo) => {
                const result = accountsApi.deleteAccount(id, reassignTo);
                if (result.ok) courses.reload();
                return result;
              }}
              onDeepLinkToCourses={jumpToCoursesForAccount}
            />
          )}
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={onPaletteSelect}
        courses={courses.courses}
        accounts={accountsApi.accounts}
      />
      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
