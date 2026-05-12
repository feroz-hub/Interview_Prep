import type { UdemyAccount } from "../../types";

interface Props {
  account?: UdemyAccount;
  email?: string | null;
  onClick?: () => void;
  onClear?: () => void;
  compact?: boolean;
}

// Renders a colored chip for a Udemy account, or a dashed "Unassigned" chip when no
// account is provided. The chip's color comes from the account record, so renames
// and recolors propagate everywhere this is rendered.
export default function AccountChip({ account, email, onClick, onClear, compact }: Props) {
  if (!account) {
    return (
      <span
        className="account-chip unassigned"
        onClick={onClick}
        title={email ? `Unknown account: ${email}` : "Unassigned"}
        role={onClick ? "button" : undefined}
      >
        <span className="dot" />
        {compact ? "—" : email || "Unassigned"}
      </span>
    );
  }
  const label = compact
    ? (account.displayName || account.email.split("@")[0])
    : `${account.displayName ?? account.email.split("@")[0]} · ${account.email}`;
  return (
    <span
      className="account-chip"
      style={{ ["--chip-c" as never]: account.color }}
      onClick={onClick}
      title={account.email}
      role={onClick ? "button" : undefined}
    >
      <span className="dot" />
      {label}
      {onClear && (
        <button
          type="button"
          className="x"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          aria-label="Clear account filter"
        >×</button>
      )}
    </span>
  );
}

interface AvatarProps {
  account: UdemyAccount;
  size?: "xs" | "sm" | "lg";
  title?: string;
}
export function AccountAvatar({ account, size = "sm", title }: AvatarProps) {
  const cls = size === "lg" ? "lg" : size === "xs" ? "xs" : "";
  return (
    <span
      className={`account-avatar ${cls}`}
      style={{ ["--chip-c" as never]: account.color }}
      title={title ?? `${account.displayName ?? ""} ${account.email}`.trim()}
      aria-label={title ?? account.email}
    />
  );
}
