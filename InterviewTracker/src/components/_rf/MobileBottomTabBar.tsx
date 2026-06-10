import type { ReactNode } from "react";
import { BarChart3, Home, LibraryBig, PenLine } from "lucide-react";
import type { View } from "../../types";

interface Props {
  view: View;
  setView: (v: View) => void;
  dueCount: number;
}

interface Tab {
  id: View;
  label: string;
  icon: ReactNode;
}

// Unified nav vocabulary (v3): Home / Library / Study / Progress — the same
// words the desktop top bar uses.
const TABS: ReadonlyArray<Tab> = [
  { id: "dashboard",  label: "Home",     icon: <Home size={22} /> },
  { id: "library",    label: "Library",  icon: <LibraryBig size={22} /> },
  { id: "flashcards", label: "Study",    icon: <PenLine size={22} /> },
  { id: "review",     label: "Progress", icon: <BarChart3 size={22} /> },
];

/**
 * 4-tab bottom nav. Active = icon + label; inactive = icon only.
 * 56 px min target, safe-area-bottom honoured. Library merges
 * browse + courses (and accounts) into a single destination.
 */
export default function MobileBottomTabBar({ view, setView, dueCount }: Props) {
  // Browse / Courses / Course-detail / Accounts all collapse into Library.
  const activeId: View =
    view === "browse" || view === "courses" || view === "course-detail" || view === "accounts"
      ? "library"
      : view;

  return (
    <nav className="rf-tabbar" role="tablist" aria-label="Primary navigation">
      {TABS.map((t) => {
        const isActive = activeId === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? "page" : undefined}
            aria-label={t.label}
            className={`rf-tab${isActive ? " active" : ""}`}
            onClick={() => setView(t.id)}
          >
            {isActive && <span className="nav-pill" aria-hidden />}
            <span className="rf-tab-icon" aria-hidden>{t.icon}</span>
            <span className="rf-tab-label">{t.label}</span>
            {t.id === "review" && dueCount > 0 && (
              <span className="rf-tab-badge" aria-label={`${dueCount} due`}>{dueCount}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
