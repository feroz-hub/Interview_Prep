import type { CSSProperties, ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Reserve space + render a 4 px-wide vertical accent on the left edge. */
  accentLeading?: boolean;
  /** Slightly brighter hairline. Use sparingly. */
  highlight?: boolean;
  id?: string;
  "aria-labelledby"?: string;
}

/**
 * Flat surface. 1 px hairline, no blur, no shadow. Depth comes from
 * type scale, not material effects.
 */
export default function Card({
  children, className, style, accentLeading, highlight, id, ...aria
}: Props) {
  const cls = [
    "rf-card",
    highlight && "highlight",
    accentLeading && "accent-leading",
    className,
  ].filter(Boolean).join(" ");
  return (
    <div id={id} className={cls} style={style} aria-labelledby={aria["aria-labelledby"]}>
      {children}
    </div>
  );
}
