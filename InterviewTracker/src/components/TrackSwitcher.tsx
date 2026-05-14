import type { Track } from "../types";

interface Props {
  value: Track;
  onChange: (t: Track) => void;
  dotnetCount: number;
  pentestCount: number;
}

export default function TrackSwitcher({ value, onChange, dotnetCount, pentestCount }: Props) {
  return (
    <div className="track-switcher" role="tablist" aria-label="Choose interview track">
      <button
        role="tab"
        aria-selected={value === "dotnet"}
        className={`track-tab ${value === "dotnet" ? "active" : ""}`}
        onClick={() => onChange("dotnet")}
        title="Switch to the .NET interview track"
      >
        <span className="track-icon" aria-hidden>🟦</span>
        <span className="track-label">.NET</span>
        <span className="track-count">{dotnetCount}</span>
      </button>
      <button
        role="tab"
        aria-selected={value === "pentest"}
        className={`track-tab ${value === "pentest" ? "active" : ""}`}
        onClick={() => onChange("pentest")}
        title="Switch to the Pentest interview track"
      >
        <span className="track-icon" aria-hidden>🛡️</span>
        <span className="track-label">Pentest</span>
        <span className="track-count">{pentestCount}</span>
      </button>
    </div>
  );
}
