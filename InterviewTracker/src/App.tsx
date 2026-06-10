import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { AccountAvatar } from "./components/courses/AccountChip";
import ToastHost from "./components/ToastHost";
import ThemeSwitcher from "./components/ThemeSwitcher";
import Pomodoro from "./components/Pomodoro";
import LoadingScreen from "./components/LoadingScreen";
import ViewSkeleton from "./components/ViewSkeleton";
import TrackSwitcher from "./components/TrackSwitcher";
import XPBar from "./components/XPBar";
import MoreSheet from "./components/MoreSheet";
import MobileHeader from "./components/_rf/MobileHeader";
import MobileBottomTabBar from "./components/_rf/MobileBottomTabBar";
import { withViewTransition } from "./lib/viewTransition";
import { initPointerGlow } from "./lib/pointerGlow";
import { getInterviewDate, setInterviewDate } from "./lib/db";
import ShortcutsOverlay from "./components/ShortcutsOverlay";
import type { PaletteAction } from "./components/CommandPalette";
import {
  CalendarClock, Download, Menu, RotateCcw, Search, ShieldHalf, Target, Upload, UserRound,
} from "lucide-react";

// Views are code-split so the initial chunk stays lean. The loader thunks are
// kept separately from lazy() so nav hover/focus can *preload* a chunk before
// the click lands (perceived-instant navigation).
const loaders = {
  dashboard: () => import("./components/Dashboard"),
  browse: () => import("./components/Browse"),
  flashcards: () => import("./components/Flashcards"),
  palette: () => import("./components/CommandPalette"),
  courses: () => import("./components/courses/CoursesList"),
  courseDetail: () => import("./components/courses/CourseDetail"),
  accounts: () => import("./components/courses/AccountsView"),
};
const preload = (k: keyof typeof loaders) => { void loaders[k](); };

const Dashboard = lazy(loaders.dashboard);
const Browse = lazy(loaders.browse);
const Flashcards = lazy(loaders.flashcards);
const CommandPalette = lazy(loaders.palette);
const CoursesList = lazy(loaders.courses);
const CourseDetail = lazy(loaders.courseDetail);
const AccountsView = lazy(loaders.accounts);
const MobileDashboard = lazy(() => import("./components/_rf/MobileDashboard"));
const MobileLibraryV2 = lazy(() => import("./components/_rf/MobileLibraryV2"));
const MobileQuestionDetail = lazy(() => import("./components/_rf/MobileQuestionDetail"));
const MobileSession = lazy(() => import("./components/_rf/MobileSession"));
const MobileStats = lazy(() => import("./components/_rf/MobileStats"));
import { isDue } from "./lib/sm2";
import type { Achievement } from "./lib/achievements";
import { detectCourseAchievements } from "./lib/achievements";
import { getMeta, setMeta, loadBadges } from "./lib/db";
import { getTrackXp } from "./lib/xp";
import { detectAndUnlockBadges } from "./lib/pentestBadges";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [paletteOpen, setPaletteOpen] = useState(false);
  // The palette chunk is fetched on first open, then stays mounted so its
  // input state and result cache survive close/reopen.
  const [paletteMounted, setPaletteMounted] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
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

  // Desktop has no dedicated "library" screen — Browse IS the library there.
  // Without this, a direct load of /library (deep link, refresh, or a
  // desktop⇄mobile resize) left the main area permanently empty.
  useEffect(() => {
    if (isDesktop && view === "library") setView("browse");
  }, [isDesktop, view]);

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

  // Navigate with a document cross-fade (View Transitions API where
  // supported). Also closes the More sheet so it never lingers over a
  // freshly opened view.
  const goView = useCallback((v: View) => {
    withViewTransition(() => {
      setView(v);
      setMoreOpen(false);
    });
  }, []);

  // Mount the lazy palette chunk the first time it opens.
  useEffect(() => {
    if (paletteOpen) setPaletteMounted(true);
  }, [paletteOpen]);

  // One delegated pointer listener feeds the card spotlight effect.
  useEffect(() => initPointerGlow(), []);

  // Fetch the landing view's chunk while the database initializes so the
  // first render after `ready` is instant instead of queueing another
  // network round-trip behind the LoadingScreen.
  useEffect(() => {
    if (!isDesktop) return; // mobile view chunks are ~1-2 KB; not worth it
    const k: keyof typeof loaders =
      view === "courses" || view === "course-detail" ? "courses"
      : view === "accounts" ? "accounts"
      : view === "flashcards" || view === "review" ? "flashcards"
      : view === "browse" || view === "library" ? "browse"
      : "dashboard";
    preload(k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      if (e.key === "?") { setShortcutsOpen(true); return; }
      if (e.key === "t" && e.shiftKey) {
        setTrack(track === "pentest" ? "dotnet" : "pentest");
        return;
      }
      // Digit nav is suspended inside Study — there 1-4 rate the card.
      const studying = view === "flashcards" || view === "review";
      if (studying) return;
      if (e.key === "1") goView("dashboard");
      else if (e.key === "2") goView("browse");
      else if (e.key === "3") goView("courses");
      else if (e.key === "4") goView(dueCount > 0 ? "review" : "flashcards");
      else if (e.key === "5") {
        if (e.shiftKey) {
          if (activeCourseId) goView("course-detail");
        } else {
          goView("courses");
        }
      }
      else if (e.key === "6") goView("accounts");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeCourseId, track, setTrack, goView, view, dueCount]);

  // Interview countdown chip — recomputes instantly when a date is set
  // anywhere (lib/db dispatches interview-date-changed).
  const [interviewDays, setInterviewDays] = useState<number | null>(null);
  useEffect(() => {
    if (!progress.ready) return;
    const compute = () => {
      const d = getInterviewDate(track);
      if (!d) { setInterviewDays(null); return; }
      setInterviewDays(
        Math.ceil((new Date(`${d.date}T00:00:00`).getTime() - Date.now()) / 86_400_000)
      );
    };
    compute();
    window.addEventListener("interview-date-changed", compute);
    return () => window.removeEventListener("interview-date-changed", compute);
  }, [progress.ready, track]);

  // Command verbs — ⌘K doubles as a command bar.
  const paletteActions = useMemo<PaletteAction[]>(() => {
    const acts: PaletteAction[] = [];
    const lastCourse = activeCourseId ? courses.getCourseById(activeCourseId) : undefined;
    acts.push({
      id: "start-review",
      label: "Start review session",
      hint: dueCount > 0 ? `${dueCount} due` : "nothing due — shuffles all",
      run: () => goView(dueCount > 0 ? "review" : "flashcards"),
    });
    if (lastCourse) {
      acts.push({
        id: "log-25",
        label: `Log 25 min to “${lastCourse.title}”`,
        hint: "Course session",
        run: () => {
          courses.logSession(lastCourse.id, null, 25, "Quick log via ⌘K");
          pushToast({ icon: "📚", title: "Logged 25 minutes", body: lastCourse.title });
        },
      });
    }
    acts.push({
      id: "switch-track",
      label: `Switch track to ${track === "pentest" ? ".NET" : "Pentest"}`,
      hint: "⇧T",
      run: () => setTrack(track === "pentest" ? "dotnet" : "pentest"),
    });
    ([["midnight", "Midnight"], ["aurora", "Aurora"], ["sunset", "Sunset"], ["mint", "Mint"]] as const)
      .forEach(([id, label]) => {
        acts.push({ id: `theme-${id}`, label: `Theme: ${label}`, hint: "Appearance", run: () => setTheme(id) });
      });
    ([[7, "+1 week"], [14, "+2 weeks"], [30, "+1 month"]] as const).forEach(([days, label]) => {
      acts.push({
        id: `interview-${days}`,
        label: `Set interview date ${label}`,
        hint: "Countdown",
        run: () => {
          const d = new Date();
          d.setDate(d.getDate() + days);
          const iso = d.toISOString().slice(0, 10);
          setInterviewDate(track, iso);
          pushToast({ icon: "📅", title: "Interview date set", body: iso });
        },
      });
    });
    acts.push({ id: "pomodoro", label: "Start Pomodoro", hint: "25 min focus", run: () => pomo.start() });
    acts.push({ id: "export-db", label: "Export .sqlite", hint: "Download database", run: () => progress.exportSqlite() });
    acts.push({ id: "import-db", label: "Import .sqlite", hint: "Replace database", run: () => fileRef.current?.click() });
    acts.push({ id: "shortcuts", label: "Keyboard shortcuts", hint: "?", run: () => setShortcutsOpen(true) });
    return acts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCourseId, courses, dueCount, goView, pomo, progress, pushToast, setTheme, setTrack, track]);

  const onPaletteSelect = (sel:
    | { kind: "question"; id: number }
    | { kind: "course"; id: number }
    | { kind: "account"; email: string }
  ) => {
    if (sel.kind === "question") {
      setForcedQuestionId(sel.id);
      goView("browse");
    } else if (sel.kind === "course") {
      openCourse(sel.id);
    } else if (sel.kind === "account") {
      jumpToCoursesForAccount(sel.email);
    }
  };
  const onJumpToTopic = (topic: string) => {
    setForcedTopic(topic);
    goView("browse");
  };

  const openCourse = (id: number) => {
    setMeta("last_open_course_id", String(id));
    withViewTransition(() => {
      setActiveCourseId(id);
      setView("course-detail");
      setMoreOpen(false);
    });
  };

  const jumpToCoursesForAccount = (email: string) => {
    setPendingAccountFilter(email);
    goView("courses");
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
  const trackBrandIcon = track === "pentest" ? <ShieldHalf size={17} /> : <Target size={17} />;

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
          <Suspense fallback={<ViewSkeleton />}>
          {/* Question Detail overlays everything when active. */}
          {detailQ ? (
            <MobileQuestionDetail
              question={detailQ}
              state={progress.state}
              track={track}
              onBack={() => withViewTransition(() => setActiveQuestionId(null))}
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
                  onOpenQuestion={(id) => withViewTransition(() => setActiveQuestionId(id))}
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
          </Suspense>
        </main>

        <MobileBottomTabBar view={view} setView={goView} dueCount={dueCount} />

        {paletteMounted && (
          <Suspense fallback={null}>
            <CommandPalette
              open={paletteOpen}
              onClose={() => setPaletteOpen(false)}
              onSelect={onPaletteSelect}
              courses={courses.courses}
              accounts={accountsApi.accounts}
              actions={paletteActions}
              questions={activeQuestions}
            />
          </Suspense>
        )}

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
                <Download size={15} aria-hidden /> Export .sqlite
              </button>
              <button type="button" className="more-action" onClick={() => fileRef.current?.click()}>
                <Upload size={15} aria-hidden /> Import .sqlite
              </button>
              <button type="button" className="more-action danger" onClick={() => progress.reset()}>
                <RotateCcw size={15} aria-hidden /> Reset local DB
              </button>
            </div>
          </div>
        </MoreSheet>

        <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
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
                  ><Search size={16} aria-hidden /></button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setMoreOpen(true)}
                    aria-label="More options"
                    aria-haspopup="dialog"
                    aria-expanded={moreOpen}
                    title="More"
                  ><Menu size={16} aria-hidden /></button>
                </>
              )}
            </div>
          </div>

          {isDesktop && (
            <div className="topbar-row topbar-row-secondary">
              <nav aria-label="Primary navigation">
                <button
                  className={view === "dashboard" ? "active" : ""}
                  onClick={() => goView("dashboard")}
                  onPointerEnter={() => preload("dashboard")}
                  onFocus={() => preload("dashboard")}
                >
                  {view === "dashboard" && <span className="nav-pill" aria-hidden />}
                  Home
                </button>
                <button
                  className={view === "browse" ? "active" : ""}
                  onClick={() => goView("browse")}
                  onPointerEnter={() => preload("browse")}
                  onFocus={() => preload("browse")}
                >
                  {view === "browse" && <span className="nav-pill" aria-hidden />}
                  Library
                </button>
                <button
                  className={view === "courses" || view === "course-detail" ? "active" : ""}
                  onClick={() => goView("courses")}
                  onPointerEnter={() => preload("courses")}
                  onFocus={() => preload("courses")}
                >
                  {(view === "courses" || view === "course-detail") && <span className="nav-pill" aria-hidden />}
                  Courses
                </button>
                <button
                  className={view === "flashcards" || view === "review" ? "active" : ""}
                  onClick={() => goView(dueCount > 0 ? "review" : "flashcards")}
                  onPointerEnter={() => preload("flashcards")}
                  onFocus={() => preload("flashcards")}
                >
                  {(view === "flashcards" || view === "review") && <span className="nav-pill" aria-hidden />}
                  Study {dueCount > 0 && <span className="badge">{dueCount}</span>}
                </button>
              </nav>

              <div className="actions">
                {interviewDays !== null && interviewDays <= 14 && (
                  <button
                    className={`countdown-chip${interviewDays <= 3 ? " urgent" : ""}`}
                    onClick={() => goView("dashboard")}
                    title="Interview countdown — open Home"
                  >
                    <CalendarClock size={13} aria-hidden />
                    {interviewDays <= 0 ? "Today" : `${interviewDays}d`}
                  </button>
                )}
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
                  onPointerEnter={() => preload("palette")}
                  onFocus={() => preload("palette")}
                  title="Search · ⌘K"
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px" }}
                >
                  <Search size={14} aria-hidden />
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
                <button className="ghost icon-text" onClick={progress.exportSqlite} title="Download .sqlite database file">
                  <Download size={13} aria-hidden /> .sqlite
                </button>
                <button className="ghost" onClick={() => fileRef.current?.click()} title="Import .sqlite file" aria-label="Import .sqlite file">
                  <Upload size={13} aria-hidden />
                </button>
                <button className="ghost" onClick={progress.reset} title="Reset progress (wipes SQLite DB)" aria-label="Reset local database">
                  <RotateCcw size={13} aria-hidden />
                </button>
              </div>
            </div>
          )}
        </header>

        <main id="main-view" className="view" tabIndex={-1}>
          <Suspense fallback={<ViewSkeleton />}>
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
              onStartReview={() => goView("review")}
              onStartStudy={() => goView("flashcards")}
              onOpenLibrary={() => goView("browse")}
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
          {(view === "flashcards" || view === "review") && (
            <Flashcards
              state={progress.state}
              rate={(id, r) => progress.rate(id, r, track)}
              setConfidence={(id, c) => progress.setConfidence(id, c, track)}
              mode={view === "review" ? "review" : "all"}
              onModeChange={(m) => goView(m === "review" ? "review" : "flashcards")}
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
          </Suspense>
        </main>

        {/* (Mobile branch returns early above; no bottom-tab in the desktop tree.) */}
      </div>

      {paletteMounted && (
        <Suspense fallback={null}>
          <CommandPalette
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            onSelect={onPaletteSelect}
            courses={courses.courses}
            accounts={accountsApi.accounts}
            actions={paletteActions}
            questions={activeQuestions}
          />
        </Suspense>
      )}

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
            <UserRound size={15} aria-hidden /> Manage accounts
          </button>
        </div>

        <div className="more-section">
          <div className="more-section-label">Database</div>
          <div className="more-actions">
            <button type="button" className="more-action" onClick={() => { progress.exportSqlite(); }}>
              <Download size={15} aria-hidden /> Export .sqlite
            </button>
            <button type="button" className="more-action" onClick={() => fileRef.current?.click()}>
              <Upload size={15} aria-hidden /> Import .sqlite
            </button>
            <button type="button" className="more-action danger" onClick={() => progress.reset()}>
              <RotateCcw size={15} aria-hidden /> Reset local DB
            </button>
          </div>
        </div>
      </MoreSheet>

      <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {importInput}
      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
