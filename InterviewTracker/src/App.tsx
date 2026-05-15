import { useEffect, useMemo, useRef, useState } from "react";
import type { View, Question, Badge } from "./types";
import { QUESTIONS } from "./data/questions";
// Pentest data is dynamically imported on first track-switch — see effect below.
const PENTEST_COUNT = 500;
import { useProgress } from "./hooks/useProgress";
import { useCourses } from "./hooks/useCourses";
import { useAccounts } from "./hooks/useAccounts";
import { useTheme } from "./hooks/useTheme";
import { usePomodoro } from "./hooks/usePomodoro";
import { useToasts } from "./hooks/useToasts";
import { useTrack } from "./hooks/useTrack";
import { useIsDesktop } from "./hooks/useMediaQuery";
import { useUrlView } from "./hooks/useUrlView";
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
import TrackSwitcher from "./components/TrackSwitcher";
import XPBar from "./components/XPBar";
import MoreSheet from "./components/MoreSheet";
import MobileHeader from "./components/_rf/MobileHeader";
import MobileDashboard from "./components/_rf/MobileDashboard";
import MobileLibraryV2 from "./components/_rf/MobileLibraryV2";
import MobileQuestionDetail from "./components/_rf/MobileQuestionDetail";
import MobileSession from "./components/_rf/MobileSession";
import MobileStats from "./components/_rf/MobileStats";
import MobileBottomTabBar from "./components/_rf/MobileBottomTabBar";
import { isDue } from "./lib/sm2";
import type { Achievement } from "./lib/achievements";
import { detectCourseAchievements } from "./lib/achievements";
import { getMeta, setMeta, loadBadges } from "./lib/db";
import { getTrackXp } from "./lib/xp";
import { detectAndUnlockBadges } from "./lib/pentestBadges";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [forcedTopic, setForcedTopic] = useState<string | null>(null);
  const [forcedQuestionId, setForcedQuestionId] = useState<number | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<number | null>(null);
  // Mobile question-detail open state (Phase 5).
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);
  // Session entry filter (Phase 6).
  const [sessionFilter, setSessionFilter] = useState<{
    topic: string | "all";
    queue: "due" | "new" | "all" | "mastered" | "saved";
  } | null>(null);
  const [pendingAccountFilter, setPendingAccountFilter] = useState<string | null | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  const isDesktop = useIsDesktop();
  // Sync URL ↔ view state. Back/forward gestures work; deep links work.
  useUrlView(view, setView);

  // Body class toggle so the legacy desktop chrome can step aside on mobile.
  useEffect(() => {
    document.body.classList.toggle("rf-mobile", !isDesktop);
    return () => { document.body.classList.remove("rf-mobile"); };
  }, [isDesktop]);

  const { theme, setTheme } = useTheme();
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

  const onAchievement = (a: Achievement) => {
    pushToast({ icon: a.icon, title: a.title, body: a.body });
  };

  // Active track is loaded after the DB is ready (initial value 'dotnet').
  const [trackReady, setTrackReady] = useState(false);
  const { track, setTrack } = useTrack(trackReady);

  // Lazy-loaded pentest question set. Stays null until the user actually opens
  // the Pentest track, then is cached for the rest of the session.
  const [pentestQuestions, setPentestQuestions] = useState<Question[] | null>(null);
  const [pentestLoading, setPentestLoading] = useState(false);

  useEffect(() => {
    if (track !== "pentest" || pentestQuestions || pentestLoading) return;
    setPentestLoading(true);
    import("./data/pentestQuestions").then((mod) => {
      setPentestQuestions(mod.PENTEST_QUESTIONS);
      setPentestLoading(false);
    });
  }, [track, pentestQuestions, pentestLoading]);

  const activeQuestions: Question[] = useMemo(() => {
    if (track === "pentest") return pentestQuestions ?? [];
    return QUESTIONS;
  }, [track, pentestQuestions]);

  const progress = useProgress(activeQuestions, onAchievement);
  const courses = useCourses();
  const accountsApi = useAccounts();

  // Once the DB is ready, allow the track hook to read its persisted value.
  useEffect(() => {
    if (progress.ready) setTrackReady(true);
  }, [progress.ready]);

  // XP + badges (recomputed when progress changes)
  const [xp, setXp] = useState(0);
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    if (!progress.ready) return;
    setXp(getTrackXp(track));
    setBadges(loadBadges(track));
  }, [progress.ready, progress.state, track]);

  // Detect new badges after each progress update
  useEffect(() => {
    if (!progress.ready) return;
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (progress.state.activity[key] && progress.state.activity[key].reviews > 0) streak += 1;
      else if (i > 0) break;
    }
    const fresh = detectAndUnlockBadges(track, {
      questions: activeQuestions,
      state: progress.state,
      totalXp: getTrackXp(track),
      streak,
    });
    for (const b of fresh) {
      pushToast({ icon: b.icon, title: `Badge unlocked: ${b.title}`, body: b.body });
    }
    if (fresh.length > 0) setBadges(loadBadges(track));
  }, [progress.state, progress.ready, track, activeQuestions, pushToast]);

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
    return activeQuestions.filter((q) => isDue(progress.state.progress[q.id], now)).length;
  }, [progress.state, progress.ready, activeQuestions]);

  // Global keyboard shortcuts (desktop primarily)
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
      else if (e.key === "t" && e.shiftKey) {
        setTrack(track === "pentest" ? "dotnet" : "pentest");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeCourseId, track, setTrack]);

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

  // Close the More sheet whenever the user navigates.
  const goView = (v: View) => {
    setView(v);
    setMoreOpen(false);
  };

  if (!progress.ready || !courses.ready || !accountsApi.ready) {
    return (
      <>
        <div className="mesh-bg" />
        <LoadingScreen />
      </>
    );
  }

  if (progress.initError) {
    return (
      <>
        <div className="mesh-bg" />
        <div className="empty" style={{ maxWidth: 560, margin: "10vh auto" }}>
          <div className="icon">⚠️</div>
          <h3>Couldn't initialize the local database</h3>
          <div style={{ marginBottom: 16 }}>
            <code style={{ wordBreak: "break-word" }}>{progress.initError.message}</code>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 16 }}>
            Open DevTools → Console for the full stack trace. You can also reset
            the local DB and try again.
          </div>
          <button className="primary" onClick={() => progress.reset()}>Reset local DB</button>
        </div>
      </>
    );
  }

  if (track === "pentest" && !pentestQuestions) {
    return (
      <>
        <div className="mesh-bg" />
        <LoadingScreen />
      </>
    );
  }

  const activeCourse = activeCourseId ? courses.getCourseById(activeCourseId) : undefined;
  const trackName = track === "pentest" ? "Pentest" : ".NET";
  const trackBrandIcon = track === "pentest" ? "🛡️" : "🎯";

  const importInput = (
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
  );

  // ============================================================
  // Mobile branch — RF redesign. Editorial type, flat surfaces,
  // segmented progress, 4-tab bottom nav. Desktop tree untouched.
  // ============================================================
  if (!isDesktop) {
    const detailQ = activeQuestionId
      ? activeQuestions.find((q) => q.id === activeQuestionId) ?? null
      : null;

    return (
      <>
        <a href="#main-view" className="skip-link">Skip to content</a>
        <MobileHeader
          trackTitle={`${trackName} Tracker`}
          track={track}
          onTrackChange={setTrack}
          dotnetCount={QUESTIONS.length}
          pentestCount={PENTEST_COUNT}
          onOpenSearch={() => setPaletteOpen(true)}
          onOpenMore={() => setMoreOpen(true)}
        />

        <main id="main-view" tabIndex={-1}>
          {/* Question Detail overlays everything when active. */}
          {detailQ ? (
            <MobileQuestionDetail
              question={detailQ}
              state={progress.state}
              track={track}
              onBack={() => setActiveQuestionId(null)}
              onPracticeOne={() => {
                setSessionFilter({ topic: "all", queue: "all" });
                setActiveQuestionId(null);
                goView("flashcards");
              }}
              setNotes={progress.setNotes}
              setConfidence={(id, c) => progress.setConfidence(id, c, track)}
            />
          ) : (
            <>
              {view === "dashboard" && (
                <MobileDashboard
                  state={progress.state}
                  questions={activeQuestions}
                  track={track}
                  trackTitle={trackName}
                />
              )}

              {(view === "library" || view === "browse" || view === "courses" ||
                view === "course-detail" || view === "accounts") && (
                <MobileLibraryV2
                  questions={activeQuestions}
                  state={progress.state}
                  onOpenQuestion={(id) => setActiveQuestionId(id)}
                  onStartSession={(f) => {
                    setSessionFilter(f);
                    goView("flashcards");
                  }}
                />
              )}

              {view === "flashcards" && (
                <MobileSession
                  questions={activeQuestions}
                  state={progress.state}
                  track={track}
                  initialFilter={sessionFilter ?? undefined}
                  rate={(id, r) => progress.rate(id, r, track)}
                  onClose={() => { setSessionFilter(null); goView("library"); }}
                />
              )}

              {view === "review" && (
                <MobileStats state={progress.state} questions={activeQuestions} />
              )}
            </>
          )}
        </main>

        <MobileBottomTabBar view={view} setView={goView} dueCount={dueCount} />

        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onSelect={onPaletteSelect}
          courses={courses.courses}
          accounts={accountsApi.accounts}
          questions={activeQuestions}
        />

        <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
          <div className="more-section">
            <div className="more-section-label">Progress</div>
            <XPBar xp={xp} track={track} />
          </div>
          <div className="more-section">
            <div className="more-section-label">Focus</div>
            <Pomodoro
              mode={pomo.mode}
              time={pomo.time}
              start={pomo.start}
              pause={pomo.pause}
              reset={pomo.reset}
              skip={pomo.skip}
            />
          </div>
          <div className="more-section">
            <div className="more-section-label">Appearance</div>
            <ThemeSwitcher theme={theme} setTheme={setTheme} />
          </div>
          <div className="more-section">
            <div className="more-section-label">Database</div>
            <div className="more-actions">
              <button type="button" className="more-action" onClick={() => { progress.exportSqlite(); }}>
                <span aria-hidden>⬇</span> Export .sqlite
              </button>
              <button type="button" className="more-action" onClick={() => fileRef.current?.click()}>
                <span aria-hidden>⬆</span> Import .sqlite
              </button>
              <button type="button" className="more-action danger" onClick={() => progress.reset()}>
                <span aria-hidden>⟲</span> Reset local DB
              </button>
            </div>
          </div>
        </MoreSheet>

        {importInput}
        <ToastHost toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // ============================================================
  // Desktop branch — existing layout, untouched.
  // ============================================================
  return (
    <>
      <a href="#main-view" className="skip-link">Skip to content</a>
      <div className="mesh-bg" />
      <div className={`app${isDesktop ? "" : " app-mobile"}`} data-track={track}>
        <header className="topbar pt-safe px-safe" role="banner">
          <div className="topbar-row topbar-row-primary">
            <div className="brand">
              <div className="brand-icon" aria-hidden>{trackBrandIcon}</div>
              <div className="brand-text">
                <h1>{trackName} Tracker</h1>
                <div className="sub">
                  {activeQuestions.length} questions{isDesktop ? ` · ${courses.courses.length} courses · ${accountsApi.accounts.length} accounts` : ""}
                </div>
              </div>
            </div>

            <div className="topbar-trailing">
              <TrackSwitcher
                value={track}
                onChange={setTrack}
                dotnetCount={QUESTIONS.length}
                pentestCount={PENTEST_COUNT}
              />

              {!isDesktop && (
                <>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setPaletteOpen(true)}
                    aria-label="Search"
                    title="Search"
                  >⌕</button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setMoreOpen(true)}
                    aria-label="More options"
                    aria-haspopup="dialog"
                    aria-expanded={moreOpen}
                    title="More"
                  >☰</button>
                </>
              )}
            </div>
          </div>

          {isDesktop && (
            <div className="topbar-row topbar-row-secondary">
              <nav aria-label="Primary navigation">
                <button className={view === "dashboard" ? "active" : ""} onClick={() => goView("dashboard")}>
                  Dashboard
                </button>
                <button className={view === "browse" ? "active" : ""} onClick={() => goView("browse")}>
                  Browse
                </button>
                <button
                  className={view === "courses" || view === "course-detail" ? "active" : ""}
                  onClick={() => goView("courses")}
                >
                  Courses
                </button>
                <button className={view === "flashcards" ? "active" : ""} onClick={() => goView("flashcards")}>
                  Flashcards
                </button>
                <button className={view === "review" ? "active" : ""} onClick={() => goView("review")}>
                  Review {dueCount > 0 && <span className="badge">{dueCount}</span>}
                </button>
              </nav>

              <div className="actions">
                <div className="xp-bar-wrap"><XPBar xp={xp} track={track} /></div>
                <button
                  className={`ghost ${view === "accounts" ? "active" : ""}`}
                  onClick={() => goView("accounts")}
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
                <button className="ghost" onClick={progress.reset} title="Reset progress (wipes SQLite DB)">⟲</button>
              </div>
            </div>
          )}
        </header>

        <main id="main-view" className="view" tabIndex={-1}>
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
              activeQuestions={activeQuestions}
              activeTrack={track}
              xp={xp}
              badges={badges}
            />
          )}
          {view === "browse" && (
            <Browse
              state={progress.state}
              setStatus={(id, status) => progress.setStatus(id, status, track)}
              setNotes={progress.setNotes}
              setConfidence={(id, c) => progress.setConfidence(id, c, track)}
              forcedTopic={forcedTopic}
              forcedQuestionId={forcedQuestionId}
              questions={activeQuestions}
              track={track}
            />
          )}
          {view === "flashcards" && (
            <Flashcards
              state={progress.state}
              rate={(id, r) => progress.rate(id, r, track)}
              setConfidence={(id, c) => progress.setConfidence(id, c, track)}
              mode="all"
              questions={activeQuestions}
              track={track}
            />
          )}
          {view === "review" && (
            <Flashcards
              state={progress.state}
              rate={(id, r) => progress.rate(id, r, track)}
              setConfidence={(id, c) => progress.setConfidence(id, c, track)}
              mode="review"
              questions={activeQuestions}
              track={track}
            />
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
              onBack={() => goView("courses")}
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
              <button className="primary" onClick={() => goView("courses")}>Go to Courses</button>
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

        {/* (Mobile branch returns early above; no bottom-tab in the desktop tree.) */}
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={onPaletteSelect}
        courses={courses.courses}
        accounts={accountsApi.accounts}
        questions={activeQuestions}
      />

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="more-section">
          <div className="more-section-label">Progress</div>
          <XPBar xp={xp} track={track} />
        </div>

        <div className="more-section">
          <div className="more-section-label">Focus</div>
          <Pomodoro
            mode={pomo.mode}
            time={pomo.time}
            start={pomo.start}
            pause={pomo.pause}
            reset={pomo.reset}
            skip={pomo.skip}
          />
        </div>

        <div className="more-section">
          <div className="more-section-label">Appearance</div>
          <ThemeSwitcher theme={theme} setTheme={setTheme} />
        </div>

        <div className="more-section">
          <div className="more-section-label">Account</div>
          <button
            type="button"
            className="more-action"
            onClick={() => goView("accounts")}
          >
            <span aria-hidden>👤</span> Manage accounts
          </button>
        </div>

        <div className="more-section">
          <div className="more-section-label">Database</div>
          <div className="more-actions">
            <button type="button" className="more-action" onClick={() => { progress.exportSqlite(); }}>
              <span aria-hidden>⬇</span> Export .sqlite
            </button>
            <button type="button" className="more-action" onClick={() => fileRef.current?.click()}>
              <span aria-hidden>⬆</span> Import .sqlite
            </button>
            <button type="button" className="more-action danger" onClick={() => progress.reset()}>
              <span aria-hidden>⟲</span> Reset local DB
            </button>
          </div>
        </div>
      </MoreSheet>

      {importInput}
      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
