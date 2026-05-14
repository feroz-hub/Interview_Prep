import type { View } from "../types";

interface TabDef {
  view: View;
  label: string;
  icon: string;
}

const TABS: ReadonlyArray<TabDef> = [
  { view: "dashboard",  label: "Home",   icon: "🏠" },
  { view: "browse",     label: "Browse", icon: "📚" },
  { view: "flashcards", label: "Study",  icon: "🎴" },
  { view: "review",     label: "Review", icon: "🔁" },
  { view: "courses",    label: "Courses",icon: "🎓" },
];

interface Props {
  view: View;
  setView: (v: View) => void;
  dueCount: number;
}

/**
 * Fixed bottom navigation for `< md` viewports. Five primary views.
 * Each tab is a 44 px-min target. Safe-area bottom inset is absorbed
 * by `.pb-safe` so the bar floats above the iOS home indicator.
 */
export default function BottomTabBar({ view, setView, dueCount }: Props) {
  const activeBase: View = view === "course-detail" ? "courses" : view;

  return (
    <nav
      className="bottom-tab-bar pb-safe"
      role="tablist"
      aria-label="Primary navigation"
    >
      {TABS.map((t) => {
        const isActive = activeBase === t.view;
        return (
          <button
            key={t.view}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? "page" : undefined}
            className={`bottom-tab${isActive ? " active" : ""}`}
            onClick={() => setView(t.view)}
          >
            <span className="bottom-tab-icon" aria-hidden>{t.icon}</span>
            <span className="bottom-tab-label">{t.label}</span>
            {t.view === "review" && dueCount > 0 && (
              <span className="bottom-tab-badge" aria-label={`${dueCount} due`}>
                {dueCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
