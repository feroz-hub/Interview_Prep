import type { Align, AsTag, BaseLayoutProps, Gap, Justify } from "./types";
import { cx } from "./types";

interface StackProps extends BaseLayoutProps {
  /** Gap between children. Token key. Default `md`. */
  gap?: Gap;
  /** Cross-axis (horizontal) alignment. Default `stretch`. */
  align?: Align;
  /** Main-axis (vertical) distribution. Optional. */
  justify?: Justify;
  /** Semantic tag. Default `div`. */
  as?: AsTag;
}

/**
 * Vertical flex column. Children get `min-width: 0` so that flex items
 * inside the stack don't refuse to shrink. Use anywhere you'd otherwise
 * stack divs with `marginBottom`.
 */
export default function Stack({
  gap = "md",
  align = "stretch",
  justify,
  as: Tag = "div",
  className,
  style,
  id,
  role,
  children,
  ...aria
}: StackProps) {
  return (
    <Tag
      id={id}
      role={role}
      className={cx(
        "stack",
        `gap-${gap}`,
        `align-${align}`,
        justify && `justify-${justify}`,
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
