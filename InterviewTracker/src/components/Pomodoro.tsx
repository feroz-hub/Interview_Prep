import type { PomoMode } from "../hooks/usePomodoro";

interface Props {
  mode: PomoMode;
  time: string;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
}

export default function Pomodoro({ mode, time, start, pause, reset, skip }: Props) {
  const cls = mode === "focus" ? "pomo running" : mode === "break" ? "pomo break" : "pomo";
  return (
    <div className={cls} title="Pomodoro timer">
      <span className="dot" />
      <span className="time">{time}</span>
      {mode === "idle" && <button onClick={start}>Start</button>}
      {mode !== "idle" && <button onClick={pause}>Pause</button>}
      {mode !== "idle" && <button onClick={skip}>Skip</button>}
      {mode === "idle" && time !== "25:00" && <button onClick={reset}>Reset</button>}
    </div>
  );
}
