// Pointer-tracked spotlight for glass surfaces (see styles/aurora.css §4).
// One passive, rAF-throttled listener for the whole document. It writes
// --spot-x / --spot-y / --spot-o custom properties onto the hovered surface
// only, so style invalidation stays scoped to a single element per frame.
// Touch devices never attach the listener.

const SURFACES =
  ".glass, .panel, .course-card, .account-card, .badge-tile";

export function initPointerGlow(): () => void {
  if (
    typeof window.matchMedia !== "function" ||
    !window.matchMedia("(pointer: fine)").matches
  ) {
    return () => {};
  }

  let frame = 0;
  let active: HTMLElement | null = null;

  const onMove = (e: PointerEvent) => {
    if (frame) return; // collapse to one update per frame
    const x = e.clientX;
    const y = e.clientY;
    const target =
      e.target instanceof Element ? e.target.closest<HTMLElement>(SURFACES) : null;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (active && active !== target) active.style.setProperty("--spot-o", "0");
      if (target) {
        const r = target.getBoundingClientRect();
        target.style.setProperty("--spot-x", `${(x - r.left).toFixed(1)}px`);
        target.style.setProperty("--spot-y", `${(y - r.top).toFixed(1)}px`);
        target.style.setProperty("--spot-o", "1");
      }
      active = target;
    });
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  return () => {
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener("pointermove", onMove);
  };
}
