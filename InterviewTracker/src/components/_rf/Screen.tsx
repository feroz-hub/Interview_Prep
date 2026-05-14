import type { CSSProperties, ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Full-height, safe-area aware mobile shell.
 * Lives at the top of the mobile view tree. Sets the type stack and
 * reserves bottom padding for the fixed tab bar.
 */
export default function Screen({ children, className, style }: Props) {
  return (
    <div className={`rf-screen${className ? " " + className : ""}`} style={style}>
      {children}
    </div>
  );
}
