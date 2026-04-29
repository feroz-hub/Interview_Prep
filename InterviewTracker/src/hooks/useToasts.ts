import { useCallback, useState } from "react";

export interface Toast {
  id: number;
  icon: string;
  title: string;
  body: string;
  exit?: boolean;
}

let nextId = 1;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = nextId++;
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts(prev => prev.map(x => x.id === id ? { ...x, exit: true } : x));
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== id));
      }, 320);
    }, 4200);
  }, []);

  return { toasts, push };
}
