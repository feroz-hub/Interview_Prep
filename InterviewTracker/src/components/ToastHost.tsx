import type { Toast } from "../hooks/useToasts";

export default function ToastHost({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-host">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.exit ? "exit" : ""}`}>
          <div className="toast-icon">{t.icon}</div>
          <div>
            <div className="title">{t.title}</div>
            <div className="body">{t.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
