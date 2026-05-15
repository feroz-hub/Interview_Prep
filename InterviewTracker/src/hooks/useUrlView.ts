import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { View } from "../types";

/** URL ↔ view state. Path is canonical; state mirrors. */
const PATH_TO_VIEW: Record<string, View> = {
  "/": "dashboard",
  "/home": "dashboard",
  "/library": "library",
  "/session": "flashcards",   // Study
  "/stats": "dashboard",      // Stats reuses dashboard for now
  "/review": "review",
  "/accounts": "accounts",
};

const VIEW_TO_PATH: Record<View, string> = {
  dashboard: "/",
  browse: "/library",
  library: "/library",
  flashcards: "/session",
  review: "/review",
  courses: "/library",
  "course-detail": "/library",
  accounts: "/accounts",
};

/**
 * Bidirectional sync between the legacy `view` state machine and the URL.
 * Stays no-op when both already agree, so it survives a back/forward gesture.
 */
export function useUrlView(view: View, setView: (v: View) => void): void {
  const loc = useLocation();
  const nav = useNavigate();

  // URL → view (handles back/forward).
  useEffect(() => {
    const target = PATH_TO_VIEW[loc.pathname];
    if (target && target !== view) setView(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname]);

  // view → URL (handles in-app setView calls).
  useEffect(() => {
    const path = VIEW_TO_PATH[view];
    if (path && loc.pathname !== path) nav(path, { replace: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
}
