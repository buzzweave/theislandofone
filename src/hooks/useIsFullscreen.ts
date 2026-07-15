import { useEffect, useState } from "react";

/** Tracks browser fullscreen state so overlays like the bottom nav can hide cleanly. */
export function useIsFullscreen(): boolean {
  const [fs, setFs] = useState<boolean>(
    typeof document !== "undefined" && !!document.fullscreenElement
  );

  useEffect(() => {
    const onChange = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange as any);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange as any);
    };
  }, []);

  return fs;
}
