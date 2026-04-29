import { useEffect, useRef, useState } from "react";

export type PomoMode = "idle" | "focus" | "break";

const FOCUS_MIN = 25;
const BREAK_MIN = 5;

export function usePomodoro(onComplete?: (mode: "focus" | "break") => void) {
  const [mode, setMode] = useState<PomoMode>("idle");
  const [remaining, setRemaining] = useState(FOCUS_MIN * 60);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (mode === "idle") {
      if (tickRef.current) window.clearInterval(tickRef.current);
      return;
    }
    tickRef.current = window.setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          window.clearInterval(tickRef.current!);
          onComplete?.(mode);
          // auto switch
          if (mode === "focus") {
            setMode("break");
            return BREAK_MIN * 60;
          }
          setMode("idle");
          return FOCUS_MIN * 60;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [mode, onComplete]);

  const start = () => {
    setMode("focus");
    setRemaining(FOCUS_MIN * 60);
  };
  const pause = () => setMode("idle");
  const reset = () => {
    setMode("idle");
    setRemaining(FOCUS_MIN * 60);
  };
  const skip = () => {
    if (mode === "focus") {
      setMode("break");
      setRemaining(BREAK_MIN * 60);
    } else if (mode === "break") {
      setMode("idle");
      setRemaining(FOCUS_MIN * 60);
    }
  };

  const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");

  return { mode, remaining, time: `${mm}:${ss}`, start, pause, reset, skip };
}
