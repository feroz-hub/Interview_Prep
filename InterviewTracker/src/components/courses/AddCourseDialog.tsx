import { useEffect, useState } from "react";
import Modal from "./Modal";
import type { Course, UdemyAccount } from "../../types";
import { STREAM_COLORS } from "../../data/courses";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (input: Partial<Course> & { title: string; stream: string }) => void;
  accounts: UdemyAccount[];
}

const STREAM_OPTIONS = Object.keys(STREAM_COLORS);
const UNASSIGNED = "__unassigned__";

export default function AddCourseDialog({ open, onClose, onCreate, accounts }: Props) {
  const primaryEmail = accounts.find((a) => a.isPrimary)?.email ?? accounts[0]?.email ?? "";
  const [title, setTitle] = useState("");
  const [stream, setStream] = useState(STREAM_OPTIONS[0] ?? "Dotnet");
  const [platform, setPlatform] = useState("Udemy");
  const [url, setUrl] = useState("");
  const [pct, setPct] = useState(0);
  const [priority, setPriority] = useState(3);
  const [target, setTarget] = useState("");
  const [accountEmail, setAccountEmail] = useState<string>(primaryEmail || UNASSIGNED);

  useEffect(() => {
    if (open) setAccountEmail(primaryEmail || UNASSIGNED);
  }, [open, primaryEmail]);

  const reset = () => {
    setTitle("");
    setStream(STREAM_OPTIONS[0] ?? "Dotnet");
    setPlatform("Udemy");
    setUrl("");
    setPct(0);
    setPriority(3);
    setTarget("");
    setAccountEmail(primaryEmail || UNASSIGNED);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      stream,
      platform,
      url: url || null,
      progressPct: pct,
      priority,
      targetDate: target || null,
      accountEmail: accountEmail === UNASSIGNED ? null : accountEmail,
    });
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add a course">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <label htmlFor="ac-title">Title</label>
          <input
            id="ac-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ width: "100%" }}
            autoFocus
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label htmlFor="ac-stream">Stream</label>
            <select id="ac-stream" value={stream} onChange={(e) => setStream(e.target.value)} style={{ width: "100%" }}>
              {STREAM_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ac-account">Udemy account</label>
            <select id="ac-account" value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} style={{ width: "100%" }}>
              <option value={UNASSIGNED}>— Unassigned —</option>
              {accounts.map((a) => (
                <option key={a.email} value={a.email}>
                  {a.displayName ? `${a.displayName} · ${a.email}` : a.email}
                  {a.isPrimary ? " (primary)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label htmlFor="ac-platform">Platform</label>
            <input id="ac-platform" value={platform} onChange={(e) => setPlatform(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div>
            <label htmlFor="ac-url">URL</label>
            <input id="ac-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" style={{ width: "100%" }} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div>
            <label htmlFor="ac-pct">Progress %</label>
            <input id="ac-pct" type="number" min={0} max={100} value={pct} onChange={(e) => setPct(Number(e.target.value))} style={{ width: "100%" }} />
          </div>
          <div>
            <label htmlFor="ac-priority">Priority (1=high)</label>
            <input id="ac-priority" type="number" min={1} max={5} value={priority} onChange={(e) => setPriority(Number(e.target.value))} style={{ width: "100%" }} />
          </div>
          <div>
            <label htmlFor="ac-target">Target date</label>
            <input id="ac-target" type="date" value={target} onChange={(e) => setTarget(e.target.value)} style={{ width: "100%" }} />
          </div>
        </div>
        <div className="actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary" disabled={!title.trim()}>Add course</button>
        </div>
      </form>
    </Modal>
  );
}
