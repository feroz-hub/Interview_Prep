import type { Status } from "../../types";

const ITEMS: ReadonlyArray<{ id: Status; label: string }> = [
  { id: "new",       label: "New" },
  { id: "learning",  label: "Learning" },
  { id: "review",    label: "Review" },
  { id: "mastered",  label: "Mastered" },
];

interface Props {
  value: Status;
  /** Optional. If omitted, the control is read-only display. */
  onChange?: (v: Status) => void;
}

/**
 * Read-only-by-default segmented control. SRS derives status now; we
 * show it but generally don't let the user toggle it. Pass onChange
 * to permit manual override (e.g., admin / debug mode).
 */
export default function StatusSegmentedControl({ value, onChange }: Props) {
  return (
    <div className="rf-segctl" role="group" aria-label="Status">
      {ITEMS.map((item) => {
        const active = item.id === value;
        const handler = onChange ? () => onChange(item.id) : undefined;
        return (
          <button
            key={item.id}
            type="button"
            className={`rf-seg ${active ? "active" : ""} status-${item.id}`}
            aria-pressed={active}
            disabled={!onChange}
            onClick={handler}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
