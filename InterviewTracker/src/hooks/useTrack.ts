import { useCallback, useEffect, useState } from "react";
import type { Track } from "../types";
import { getMeta, setMeta } from "../lib/db";

const META_KEY = "active_track";

export function useTrack(ready: boolean): { track: Track; setTrack: (t: Track) => void } {
  const [track, setTrackState] = useState<Track>("dotnet");

  useEffect(() => {
    if (!ready) return;
    const v = getMeta(META_KEY) as Track | null;
    if (v === "dotnet" || v === "pentest") {
      setTrackState(v);
      document.body.dataset.track = v;
    } else {
      document.body.dataset.track = "dotnet";
    }
  }, [ready]);

  const setTrack = useCallback((t: Track) => {
    setTrackState(t);
    setMeta(META_KEY, t);
    document.body.dataset.track = t;
  }, []);

  return { track, setTrack };
}
