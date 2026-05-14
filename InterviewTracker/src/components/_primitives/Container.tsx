import type { AsTag, BaseLayoutProps, ContainerSize } from "./types";
import { cx } from "./types";

interface ContainerProps extends BaseLayoutProps {
  /** Max-width tier. Default `lg` (1024 px). `full` removes the cap. */
  size?: ContainerSize;
  /** Semantic tag. Default `div`. */
  as?: AsTag;
}

/**
 * Centred, viewport-capped wrapper with safe-area-aware inline padding.
 * Use as the outermost block of a view to keep content readable on wide
 * screens without losing edge-to-edge behaviour on phones.
 */
export default function Container({
  size = "lg",
  as: Tag = "div",
  className,
  style,
  id,
  role,
  children,
  ...aria
}: ContainerProps) {
  return (
    <Tag
      id={id}
      role={role}
      className={cx("container", className)}
      data-size={size}
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
