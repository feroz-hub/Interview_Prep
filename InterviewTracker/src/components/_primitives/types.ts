/* Shared types for the layout primitives.
   Strict: every union is closed; no `any`. */

export type Gap =
  | "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

export type Align =
  | "start" | "center" | "end" | "stretch" | "baseline";

export type Justify =
  | "start" | "center" | "end" | "between" | "around" | "evenly";

export type ContainerSize =
  | "sm" | "md" | "lg" | "xl" | "full";

export type GridCols =
  | 1 | 2 | 3 | 4 | 6 | 12 | "auto";

/* Limited set of semantic tags. Cap-letter assignment in JSX turns the
   string into a host-element render at the call site. */
export type AsTag =
  | "div" | "section" | "header" | "main" | "footer" | "aside"
  | "nav" | "ul" | "ol" | "li" | "article" | "form" | "fieldset";

/* Common props every primitive accepts. Avoids re-declaring everywhere. */
export interface BaseLayoutProps {
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  role?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-hidden"?: boolean;
  "data-testid"?: string;
  children?: React.ReactNode;
}

/* Join class tokens, drop falsy. Local helper used by primitives. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
