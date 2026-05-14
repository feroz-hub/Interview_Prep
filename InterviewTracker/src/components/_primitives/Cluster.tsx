import type { Align, AsTag, BaseLayoutProps, Gap, Justify } from "./types";
import { cx } from "./types";

interface ClusterProps extends BaseLayoutProps {
  /** Gap between children. Token key. Default `sm`. */
  gap?: Gap;
  /** Cross-axis (vertical) alignment. Default `center`. */
  align?: Align;
  /** Main-axis (horizontal) distribution. Optional. */
  justify?: Justify;
  /** Disable wrap. Default `true` (wraps). */
  wrap?: boolean;
  /** Semantic tag. Default `div`. */
  as?: AsTag;
}

/**
 * Horizontal flex row with `flex-wrap` on by default — the standard
 * "row of buttons / chips" container that gracefully drops to multiple
 * rows on narrow screens. Use for filter rows, action bars, tag lists.
 */
export default function Cluster({
  gap = "sm",
  align = "center",
  justify,
  wrap = true,
  as: Tag = "div",
  className,
  style,
  id,
  role,
  children,
  ...aria
}: ClusterProps) {
  return (
    <Tag
      id={id}
      role={role}
      className={cx(
        "cluster",
        `gap-${gap}`,
        `align-${align}`,
        justify && `justify-${justify}`,
        !wrap && "no-wrap",
        className,
      )}
      style={style}
      aria-label={aria["aria-label"]}
      aria-labelledby={aria["aria-labelledby"]}
      aria-describedby={aria["aria-describedby"]}
      aria-hidden={aria["aria-hidden"]}
      data-testid={aria["data-testid"]}
    >
      {children}
    </Tag>
  );
}
