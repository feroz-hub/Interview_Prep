import { useCallback, useState } from "react";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: number;
  icon: string;
  title: string;
  body: string;
  action?: ToastAction;
  exit?: boolean;
}

let nextId = 1;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = nextId++;
    setToasts(prev => [...prev, { ...t, id }]);
    // Toasts with an action stay longer so the user has time to act.
    const ttl = t.action ? 9000 : 4200;
    setTimeout(() => {
      setToasts(prev => prev.map(x => x.id === id ? { ...x, exit: true } : x));
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== id));
      }, 320);
    }, ttl);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.map(x => x.id === id ? { ...x, exit: true } : x));
    setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== id));
    }, 320);
  }, []);

  return { toasts, push, dismiss };
}
