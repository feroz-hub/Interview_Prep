import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Bottom sheet for mobile. Opens with a slide-up; backdrop click closes;
 * ESC closes; focus moves to the close button on open. Safe-area bottom
 * inset is honoured via `.pb-safe`.
 */
export default function MoreSheet({ open, onClose, title = "More", children }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ESC to close; focus close button on open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={`sheet-overlay${open ? " open" : ""}`}
      onClick={onClose}
      aria-hidden={!open}
    >
      <div
        className="sheet pb-safe"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden />
        <div className="sheet-head">
          <h2 id="sheet-title" className="sheet-title">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            className="sheet-close"
            onClick={onClose}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <div className="sheet-content">{children}</div>
      </div>
    </div>
  );
}
