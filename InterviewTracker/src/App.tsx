import { useEffect, useMemo, useRef, useState } from "react";
import type { View } from "./types";
import { QUESTIONS } from "./data/questions";
import { useProgress } from "./hooks/useProgress";
import { useTheme } from "./hooks/useTheme";
import { usePomodoro } from "./hooks/usePomodoro";
import { useToasts } from "./hooks/useToasts";
import Dashboard from "./components/Dashboard";
import Browse from "./components/Browse";
import Flashcards from "./components/Flashcards";
import CommandPalette from "./components/CommandPalette";
import ToastHost from "./components/ToastHost";
import ThemeSwitcher from "./components/ThemeSwitcher";
import Pomodoro from "./components/Pomodoro";
import LoadingScreen from "./components/LoadingScreen";
import { isDue } from "./lib/sm2";
import type { Achievement } from "./lib/achievements";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [forcedTopic, setForcedTopic] = useState<string | null>(null);
  const [forcedQuestionId, setForcedQuestionId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { theme, setTheme } = useTheme();
  const { toasts, push: pushToast } = useToasts();

  const onAchievement = (a: Achievement) => {
    pushToast({ icon: a.icon, title: a.title, body: a.body });
  };

  const progress = useProgress(onAchievement);

  const pomo = usePomodoro((mode) => {
    pushToast({
      icon: mode === "focus" ? "🍅" : "☕",
      title: mode === "focus" ? "Focus session done!" : "Break's over",
      body: mode === "focus" ? "Take a 5-minute break — you earned it." : "Time to dive back in.",
    });
  });

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
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onPaletteSelect = (id: number) => {
    setForcedQuestionId(id);
    setView("browse");
  };
  const onJumpToTopic = (topic: string) => {
    setForcedTopic(topic);
    setView("browse");
  };

  if (!progress.ready) {
    return (
      <>
        <div className="mesh-bg" />
        <LoadingScreen />
      </>
    );
  }

  return (
    <>
      <div className="mesh-bg" />
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <div className="brand-icon">🎯</div>
            <div>
              <h1>.NET Interview Tracker</h1>
              <div className="sub">{QUESTIONS.length} questions · SQLite + spaced repetition</div>
            </div>
          </div>

          <nav>
            <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>
              Dashboard
            </button>
            <button className={view === "browse" ? "active" : ""} onClick={() => setView("browse")}>
              Browse
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
                if (f) progress.importSqlite(f).catch((err) => alert("Import failed: " + err.message));
                e.target.value = "";
              }}
            />
            <button className="ghost" onClick={progress.reset} title="Reset progress (wipes SQLite DB)">⟲</button>
          </div>
        </header>

        <main className="view">
          {view === "dashboard" && (
            <Dashboard state={progress.state} onJumpToTopic={onJumpToTopic} dbStats={progress.stats} />
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
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={onPaletteSelect}
      />
      <ToastHost toasts={toasts} />
    </>
  );
}
