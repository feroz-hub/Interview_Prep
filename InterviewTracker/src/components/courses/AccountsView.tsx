import { useMemo, useState } from "react";
import type { Course, CourseSession, UdemyAccount } from "../../types";
import { streamColor } from "../../data/courses";
import { AccountAvatar } from "./AccountChip";
import Modal from "./Modal";

interface Props {
  accounts: UdemyAccount[];
  courses: Course[];
  sessions: CourseSession[];
  onAddAccount: (input: { email: string; displayName?: string | null; color?: string }) => void;
  onUpdateAccount: (id: number, patch: Partial<UdemyAccount>) => void;
  onSetPrimary: (id: number) => void;
  onDeleteAccount: (id: number, reassignTo?: string | null) => { ok: boolean; usageCount: number };
  onDeepLinkToCourses: (email: string) => void;
}

const COLOR_PALETTE = [
  "#7c8cff", "#34d399", "#f59e0b", "#ef4444", "#a855f7",
  "#06b6d4", "#22c55e", "#fb923c", "#0ea5e9", "#ec4899",
];

function isoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function weekStartIso(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return isoDate(d);
}

export default function AccountsView({
  accounts,
  courses,
  sessions,
  onAddAccount,
  onUpdateAccount,
  onSetPrimary,
  onDeleteAccount,
  onDeepLinkToCourses,
}: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ account: UdemyAccount; usageCount: number } | null>(null);

  // Per-account stats
  const thisWeekStart = weekStartIso();
  const stats = useMemo(() => {
    return accounts.map((a) => {
      const list = courses.filter((c) => c.accountEmail === a.email);
      const completed = list.filter((c) => c.status === "completed").length;
      const inProgress = list.filter((c) => c.status === "in_progress").length;
      const avg = list.length
        ? Math.round(list.reduce((s, c) => s + c.progressPct, 0) / list.length)
        : 0;
      const minsThisWeek = sessions
        .filter((s) => s.date >= thisWeekStart && list.some((c) => c.id === s.courseId))
        .reduce((s, x) => s + x.minutes, 0);
      const totalMins = sessions
        .filter((s) => list.some((c) => c.id === s.courseId))
        .reduce((s, x) => s + x.minutes, 0);
      const byStream = new Map<string, number>();
      for (const c of list) byStream.set(c.stream, (byStream.get(c.stream) ?? 0) + 1);
      return { account: a, courseCount: list.length, completed, inProgress, avg, minsThisWeek, totalMins, byStream };
    });
  }, [accounts, courses, sessions, thisWeekStart]);

  return (
    <div className="courses-view">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="section-title">Udemy accounts</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Manage the Udemy logins your courses are spread across. Click <strong>View courses</strong> to deep-link into the
            Courses list with that account pre-filtered.
          </div>
        </div>
        <button type="button" className="primary" onClick={() => setAddOpen(true)}>+ Add account</button>
      </div>

      <div className="accounts-grid">
        {stats.map(({ account, courseCount, completed, inProgress, avg, minsThisWeek, totalMins, byStream }) => (
          <AccountCard
            key={account.id}
            account={account}
            courseCount={courseCount}
            completed={completed}
            inProgress={inProgress}
            avg={avg}
            minsThisWeek={minsThisWeek}
            totalMins={totalMins}
            byStream={byStream}
            onUpdateAccount={onUpdateAccount}
            onSetPrimary={onSetPrimary}
            onRequestDelete={() => {
              const res = onDeleteAccount(account.id);
              if (!res.ok && res.usageCount > 0) {
                setDeleteTarget({ account, usageCount: res.usageCount });
              }
              // If ok=true (i.e. usage was 0), the deletion already happened.
            }}
            onView={() => onDeepLinkToCourses(account.email)}
          />
        ))}
      </div>

      <AddAccountModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={onAddAccount}
      />

      {deleteTarget && (
        <DeleteAccountModal
          target={deleteTarget}
          otherAccounts={accounts.filter((a) => a.id !== deleteTarget.account.id)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={(reassignTo) => {
            onDeleteAccount(deleteTarget.account.id, reassignTo);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

function AccountCard({
  account,
  courseCount,
  completed,
  inProgress,
  avg,
  minsThisWeek,
  totalMins,
  byStream,
  onUpdateAccount,
  onSetPrimary,
  onRequestDelete,
  onView,
}: {
  account: UdemyAccount;
  courseCount: number;
  completed: number;
  inProgress: number;
  avg: number;
  minsThisWeek: number;
  totalMins: number;
  byStream: Map<string, number>;
  onUpdateAccount: (id: number, patch: Partial<UdemyAccount>) => void;
  onSetPrimary: (id: number) => void;
  onRequestDelete: () => void;
  onView: () => void;
}) {
  const [name, setName] = useState(account.displayName ?? "");
  const totalCount = Math.max(1, [...byStream.values()].reduce((s, v) => s + v, 0));

  return (
    <div className="glass account-card">
      <div className="head">
        <AccountAvatar account={account} size="lg" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name !== (account.displayName ?? "")) {
                onUpdateAccount(account.id, { displayName: name || null });
              }
            }}
            placeholder="Display name"
            className="name"
            style={{ width: "100%", border: "none", background: "transparent", padding: 0 }}
            aria-label="Display name"
          />
          <div className="email-row">{account.email}</div>
        </div>
        {account.isPrimary ? (
          <span className="primary-badge">Primary</span>
        ) : (
          <button
            type="button"
            className="ghost"
            style={{ fontSize: 11, padding: "3px 8px" }}
            onClick={() => onSetPrimary(account.id)}
          >
            Set primary
          </button>
        )}
      </div>

      <div className="quick-stats">
        <div>
          <strong>{courseCount}</strong> courses
        </div>
        <div>
          <strong>{avg}%</strong> avg progress
        </div>
        <div>
          <strong>{Math.round(totalMins / 60)}</strong> total hours
        </div>
      </div>

      <div style={{ fontSize: 11, color: "var(--text-3)" }}>
        {completed} completed · {inProgress} in progress · {minsThisWeek}m this week
      </div>

      {byStream.size > 0 && (
        <>
          <div style={{ fontSize: 11, color: "var(--text-2)" }}>By stream</div>
          <div className="stream-mini-bar" title="Stream distribution">
            {[...byStream.entries()].map(([s, n]) => (
              <i
                key={s}
                style={{ width: `${(n / totalCount) * 100}%`, background: streamColor(s) }}
                title={`${s}: ${n}`}
              />
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {[...byStream.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => (
              <span key={s} className="topic-tag" style={{ fontSize: 10 }}>
                {s} · {n}
              </span>
            ))}
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="ghost" onClick={onView}>View courses</button>
        <ColorPicker
          currentColor={account.color}
          onChange={(c) => onUpdateAccount(account.id, { color: c })}
        />
      </div>

      <div className="danger-zone">
        <button type="button" className="danger" onClick={onRequestDelete}>
          Delete account
        </button>
        <span style={{ marginLeft: 8 }}>
          {courseCount > 0
            ? `Will reassign ${courseCount} course${courseCount === 1 ? "" : "s"}.`
            : "Not used by any courses."}
        </span>
      </div>
    </div>
  );
}

function ColorPicker({ currentColor, onChange }: { currentColor: string; onChange: (c: string) => void }) {
  return (
    <div className="color-picker" role="group" aria-label="Account color">
      {COLOR_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          className={c === currentColor ? "on" : ""}
          style={{ ["--swatch" as never]: c }}
          onClick={() => onChange(c)}
          aria-label={`Color ${c}`}
          title={c}
        />
      ))}
    </div>
  );
}

function AddAccountModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (input: { email: string; displayName?: string | null; color?: string }) => void;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    onAdd({ email: email.trim(), displayName: displayName.trim() || null, color });
    setEmail(""); setDisplayName(""); setColor(COLOR_PALETTE[0]);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Udemy account">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <label htmlFor="aa-email">Email</label>
          <input
            id="aa-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            style={{ width: "100%" }}
          />
        </div>
        <div>
          <label htmlFor="aa-name">Display name (optional)</label>
          <input
            id="aa-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Personal, Learning, Work…"
            style={{ width: "100%" }}
          />
        </div>
        <div>
          <label>Color</label>
          <ColorPicker currentColor={color} onChange={setColor} />
        </div>
        <div className="actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary" disabled={!email.trim()}>Add</button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteAccountModal({
  target,
  otherAccounts,
  onClose,
  onConfirm,
}: {
  target: { account: UdemyAccount; usageCount: number };
  otherAccounts: UdemyAccount[];
  onClose: () => void;
  onConfirm: (reassignTo: string | null) => void;
}) {
  const [choice, setChoice] = useState<string>("__clear__");
  return (
    <Modal open onClose={onClose} title={`Delete ${target.account.email}?`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="muted" style={{ fontSize: 13 }}>
          This account is referenced by <strong>{target.usageCount}</strong> course
          {target.usageCount === 1 ? "" : "s"}. Choose what to do with them — they will not be deleted.
        </div>
        <div>
          <label htmlFor="del-reassign">Reassign to</label>
          <select
            id="del-reassign"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            style={{ width: "100%" }}
          >
            <option value="__clear__">— Clear account (set to Unassigned) —</option>
            {otherAccounts.map((a) => (
              <option key={a.email} value={a.email}>
                {a.displayName ? `${a.displayName} · ${a.email}` : a.email}
              </option>
            ))}
          </select>
        </div>
        <div className="actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="danger"
            onClick={() => onConfirm(choice === "__clear__" ? null : choice)}
          >
            Delete & reassign
          </button>
        </div>
      </div>
    </Modal>
  );
}
