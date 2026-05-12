import { useMemo, useState } from "react";
import Modal from "./Modal";
import type { Course, UdemyAccount } from "../../types";
import AccountChip from "./AccountChip";

interface Props {
  open: boolean;
  onClose: () => void;
  courses: Course[];
  accounts: UdemyAccount[];
  onAssign: (courseIds: number[], email: string | null) => void;
}

export default function BulkAssignAccount({ open, onClose, courses, accounts, onAssign }: Props) {
  const [target, setTarget] = useState<string | "__unassigned__">(
    accounts.find((a) => a.isPrimary)?.email ?? accounts[0]?.email ?? "__unassigned__"
  );

  // Preview: how many courses per stream are in the selection.
  const streamCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of courses) m.set(c.stream, (m.get(c.stream) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [courses]);

  const commit = () => {
    const email = target === "__unassigned__" ? null : target;
    onAssign(courses.map((c) => c.id), email);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Assign ${courses.length} course${courses.length === 1 ? "" : "s"}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="muted" style={{ fontSize: 12 }}>
          {courses.length} course{courses.length === 1 ? "" : "s"} selected. Choose an account
          to assign them all in one operation.
        </div>

        <div>
          <label htmlFor="ba-target">Assign to</label>
          <select
            id="ba-target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            style={{ width: "100%" }}
          >
            <option value="__unassigned__">— Unassigned —</option>
            {accounts.map((a) => (
              <option key={a.email} value={a.email}>
                {a.displayName ? `${a.displayName} · ${a.email}` : a.email}
                {a.isPrimary ? " (primary)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="section-title" style={{ marginBottom: 8 }}>Selection preview</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {streamCounts.map(([s, n]) => (
              <span key={s} className="topic-tag">
                {s} · {n}
              </span>
            ))}
          </div>
        </div>

        <div className="row" style={{ gap: 8, fontSize: 12 }}>
          <span className="muted">Will become:</span>
          {target === "__unassigned__" ? (
            <AccountChip />
          ) : (
            <AccountChip account={accounts.find((a) => a.email === target)} />
          )}
        </div>

        <div className="actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="primary" onClick={commit}>
            Assign {courses.length} course{courses.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
