import { useEffect, useState, useCallback } from "react";

export type ThemeName = "midnight" | "aurora" | "sunset" | "mint";

const KEY = "interview-tracker:theme";

export const THEMES: { name: ThemeName; label: string }[] = [
  { name: "midnight", label: "Midnight" },
  { name: "aurora", label: "Aurora" },
  { name: "sunset", label: "Sunset" },
  { name: "mint", label: "Mint" },
];

export function useTheme() {
  const [theme, setTheme] = useState<ThemeName>(() => {
    const saved = localStorage.getItem(KEY) as ThemeName | null;
    return saved ?? "midnight";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(KEY, theme);
  }, [theme]);

  const cycle = useCallback(() => {
    setTheme(t => {
      const idx = THEMES.findIndex(x => x.name === t);
      return THEMES[(idx + 1) % THEMES.length].name;
    });
  }, []);

  return { theme, setTheme, cycle };
}
