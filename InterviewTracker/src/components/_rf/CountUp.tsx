import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

interface Props {
  value: number;
  /** Decimal places to display. Default 0. */
  decimals?: number;
  /** Animation duration in seconds. Default 0.9. */
  duration?: number;
  className?: string;
}

/**
 * Spring count-up of a numeric value. Honors prefers-reduced-motion by
 * snapping to the target value instantly.
 */
export default function CountUp({ value, decimals = 0, duration = 0.9, className }: Props) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<number>(value);
  const prev = useRef<number>(value);

  useEffect(() => {
    if (reduced) {
      setShown(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, duration, reduced]);

  const text = decimals === 0
    ? Math.round(shown).toString()
    : shown.toFixed(decimals);

  return <span className={className}>{text}</span>;
}
