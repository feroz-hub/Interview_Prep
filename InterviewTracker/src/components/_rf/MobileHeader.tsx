import { Menu, Search, ShieldHalf, Target } from "lucide-react";
import type { Track } from "../../types";
import TrackSwitcher from "../TrackSwitcher";

interface Props {
  trackTitle: string;
  track: Track;
  onTrackChange: (t: Track) => void;
  dotnetCount: number;
  pentestCount: number;
  onOpenSearch: () => void;
  onOpenMore: () => void;
}

/**
 * Compact mobile header. Sticky at top, hairline bottom, no blur.
 * Holds brand label + track segmented control + search + more icons.
 */
export default function MobileHeader({
  trackTitle, track, onTrackChange, dotnetCount, pentestCount,
  onOpenSearch, onOpenMore,
}: Props) {
  return (
    <header className="rf-mobile-header" role="banner">
      <div className="rf-mobile-header-row">
        <div className="rf-mobile-brand">
          <span className="rf-mobile-brand-icon" aria-hidden>
            {track === "pentest" ? <ShieldHalf size={16} /> : <Target size={16} />}
          </span>
          <span className="rf-mobile-brand-text">{trackTitle}</span>
        </div>
        <div className="rf-mobile-header-actions">
          <button
            type="button"
            className="rf-icon-btn"
            onClick={onOpenSearch}
            aria-label="Search"
          ><Search size={18} aria-hidden /></button>
          <button
            type="button"
            className="rf-icon-btn"
            onClick={onOpenMore}
            aria-label="More"
            aria-haspopup="dialog"
          ><Menu size={18} aria-hidden /></button>
        </div>
      </div>
      <div className="rf-mobile-header-row track-row">
        <TrackSwitcher
          value={track}
          onChange={onTrackChange}
          dotnetCount={dotnetCount}
          pentestCount={pentestCount}
        />
      </div>
    </header>
  );
}
