import { THEMES, type ThemeName } from "../hooks/useTheme";

interface Props {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}

export default function ThemeSwitcher({ theme, setTheme }: Props) {
  return (
    <div className="theme-switcher" title="Theme">
      {THEMES.map(t => (
        <button
          key={t.name}
          className={theme === t.name ? "active" : ""}
          onClick={() => setTheme(t.name)}
          title={t.label}
        >
          <span className={`swatch swatch-${t.name}`} />
        </button>
      ))}
    </div>
  );
}
