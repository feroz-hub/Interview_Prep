import { useEffect, useState } from "react";

/**
 * Reactive `window.matchMedia` wrapper. Re-renders the consumer when the
 * media query's match state flips. SSR-safe (defaults to `false` until
 * the effect hydrates).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Named export — semantic 'is this viewport >= md?' query. */
export function useIsDesktop(): boolean {
  // 48em matches --bp-md token. Literal here because @media doesn't accept var().
  return useMediaQuery("(min-width: 48em)");
}
