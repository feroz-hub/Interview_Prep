import { flushSync } from "react-dom";

type VTDocument = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => unknown;
};

let reduceQuery: MediaQueryList | null = null;
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  reduceQuery ??= window.matchMedia("(prefers-reduced-motion: reduce)");
  return reduceQuery.matches;
}

/**
 * Run a React state update inside the View Transitions API when available,
 * so the old and new DOM cross-fade and elements sharing a
 * `view-transition-name` (the nav pill) morph between positions.
 * Falls back to a plain update on unsupported browsers or when the user
 * prefers reduced motion. flushSync is required so the DOM is committed
 * before the browser snapshots the "new" state.
 */
export function withViewTransition(update: () => void): void {
  const doc = document as VTDocument;
  if (prefersReducedMotion() || typeof doc.startViewTransition !== "function") {
    update();
    return;
  }
  doc.startViewTransition(() => {
    flushSync(update);
  });
}
