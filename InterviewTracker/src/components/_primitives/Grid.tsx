import type { AsTag, BaseLayoutProps, Gap, GridCols } from "./types";
import { cx } from "./types";

interface GridProps extends BaseLayoutProps {
  /**
   * Column behaviour:
   *  - Numeric (1/2/3/4/6/12) → fixed column count via `repeat(N, minmax(0, 1fr))`.
   *  - `"auto"` (default) → `repeat(auto-fit, minmax(min, 1fr))`. Pair with `min`.
   */
  cols?: GridCols;
  /**
   * Minimum track size for `cols="auto"`. Any CSS length. Default `14rem`.
   * Ignored when `cols` is numeric.
   */
  min?: string;
  /** Gap between cells. Token key. Default `md`. */
  gap?: Gap;
  /** Semantic tag. Default `div`. */
  as?: AsTag;
}

/**
 * CSS-grid wrapper. Default behaviour is `auto-fit minmax(14rem, 1fr)`
 * which yields a responsive card grid without media queries. Pass a
 * numeric `cols` when you need a deterministic column count.
 */
export default function Grid({
  cols = "auto",
  min,
  gap = "md",
  as: Tag = "div",
  className,
  style,
  id,
  role,
  children,
  ...aria
}: GridProps) {
  // `min` is forwarded through a CSS variable rather than baked into the
  // class, so the same auto-fit class can be reused with any track size.
  const styleWithMin: React.CSSProperties | undefined =
    cols === "auto" && min
      ? { ...(style ?? {}), ["--grid-min" as never]: min }
      : style;

  return (
    <Tag
      id={id}
      role={role}
      className={cx("grid", `gap-${gap}`, className)}
      data-cols={String(cols)}
      style={styleWithMin}
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
