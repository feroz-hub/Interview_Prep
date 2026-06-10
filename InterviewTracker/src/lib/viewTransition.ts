import { flushSync } from "react-dom";

interface ViewTransitionHandle {
  finished?: Promise<void>;
}

type VTDocument = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => ViewTransitionHandle;
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
 *
 * `micro: true` is for in-view transitions (e.g. Browse row → detail pane):
 * it suppresses the full-document leave/enter animation via the `vt-micro`
 * class (see aurora.css) so only the named elements morph.
 */
export function withViewTransition(update: () => void, opts?: { micro?: boolean }): void {
  const doc = document as VTDocument;
  if (prefersReducedMotion() || typeof doc.startViewTransition !== "function") {
    update();
    return;
  }
  const micro = opts?.micro === true;
  if (micro) doc.documentElement.classList.add("vt-micro");
  const handle = doc.startViewTransition(() => {
    flushSync(update);
  });
  if (micro) {
    const clear = () => doc.documentElement.classList.remove("vt-micro");
    if (handle?.finished) handle.finished.then(clear, clear);
    else clear();
  }
}
