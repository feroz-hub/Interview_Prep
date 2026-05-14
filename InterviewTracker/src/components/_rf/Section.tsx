import type { ReactNode } from "react";

type Gap = 3 | 4 | 5 | 6;

interface Props {
  gap?: Gap;
  children: ReactNode;
  className?: string;
}

/** Vertical rhythm wrapper. Token-based gap. */
export default function Section({ gap = 5, children, className }: Props) {
  return (
    <section className={`rf-section gap-${gap}${className ? " " + className : ""}`}>
      {children}
    </section>
  );
}
