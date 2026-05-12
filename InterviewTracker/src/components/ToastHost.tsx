import type { Toast } from "../hooks/useToasts";

interface Props {
  toasts: Toast[];
  onDismiss?: (id: number) => void;
}

export default function ToastHost({ toasts, onDismiss }: Props) {
  return (
    <div className="toast-host">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.exit ? "exit" : ""}`}>
          <div className="toast-icon">{t.icon}</div>
          <div style={{ flex: 1 }}>
            <div className="title">{t.title}</div>
            <div className="body">{t.body}</div>
            {t.action && (
              <button
                type="button"
                className="primary"
                style={{ marginTop: 8, padding: "4px 10px", fontSize: 12 }}
                onClick={() => {
                  t.action!.onClick();
                  onDismiss?.(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
