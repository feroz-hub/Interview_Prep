import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: "Navigate",
    rows: [
      ["1", "Home"],
      ["2", "Library"],
      ["3", "Courses"],
      ["4", "Study (due first)"],
      ["6", "Accounts"],
      ["⇧ 5", "Last opened course"],
      ["⌘ K", "Command palette"],
      ["⇧ T", "Switch track (.NET ↔ Pentest)"],
    ],
  },
  {
    title: "Study session",
    rows: [
      ["Space / ↵", "Flip card"],
      ["1 · 2 · 3 · 4", "Rate Again · Hard · Good · Easy"],
      ["A", "Toggle suggested answer"],
      ["→", "Skip card"],
      ["⌘ F", "Focus / Zen mode"],
    ],
  },
  {
    title: "Anywhere",
    rows: [
      ["?", "This overlay"],
      ["Esc", "Close dialogs"],
    ],
  },
];

/** `?` keyboard-shortcut reference. Eager-loaded; it's tiny. */
export default function ShortcutsOverlay({ open, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="cmd-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()} ref={ref} tabIndex={-1}>
        <div className="shortcuts-head">
          <h3>Keyboard shortcuts</h3>
          <span className="kbd">Esc</span>
        </div>
        <div className="shortcuts-grid">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h4>{g.title}</h4>
              {g.rows.map(([keys, what]) => (
                <div className="shortcut-row" key={what}>
                  <span className="shortcut-keys">
                    {keys.split(" ").map((k, i) => (
                      k === "·" ? <i key={i}>·</i> : <span key={i} className="kbd">{k}</span>
                    ))}
                  </span>
                  <span className="shortcut-what">{what}</span>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
