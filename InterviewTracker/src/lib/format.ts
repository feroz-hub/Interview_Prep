// Locale-aware formatting via Intl — no library, follows the user's locale.
// Formatter instances are cached at module scope (constructing them is the
// expensive part).

const dateMedium = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const relativeDays = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const integer = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

/** "Jun 10, 2026" (locale-shaped). Accepts ISO strings or Date. */
export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? String(value) : dateMedium.format(d);
}

/**
 * Calendar-day distance as natural language: "today", "tomorrow",
 * "in 3 days", "2 days ago". Compares dates, not timestamps, so a review
 * due later tonight still reads "today".
 */
export function formatRelativeDays(value: string | Date, from: Date = new Date()): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(d) - startOf(from)) / 86_400_000);
  return relativeDays.format(days, "day");
}

/** Grouped integer: 12,345 / 12.345 / … per locale. */
export function formatNumber(n: number): string {
  return integer.format(n);
}
