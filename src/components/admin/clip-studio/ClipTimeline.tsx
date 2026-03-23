import { useRef, useCallback } from "react";

interface Props {
  duration: number;
  currentTime: number;
  trimStart: number;
  trimEnd: number;
  onSeek: (t: number) => void;
  onTrimStartChange: (t: number) => void;
  onTrimEndChange: (t: number) => void;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function ClipTimeline({ duration, currentTime, trimStart, trimEnd, onSeek, onTrimStartChange, onTrimEndChange }: Props) {
  const barRef = useRef<HTMLDivElement>(null);

  const getTimeFromX = useCallback((clientX: number) => {
    const bar = barRef.current;
    if (!bar || !duration) return 0;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * duration;
  }, [duration]);

  const handleBarClick = (e: React.MouseEvent) => {
    const t = getTimeFromX(e.clientX);
    if (t >= trimStart && t <= trimEnd) onSeek(t);
  };

  const makeDrag = (handler: (t: number) => void) => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const move = (ev: MouseEvent | TouchEvent) => {
      const x = "touches" in ev ? ev.touches[0].clientX : ev.clientX;
      handler(getTimeFromX(x));
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    document.addEventListener("touchmove", move);
    document.addEventListener("touchend", up);
  };

  if (!duration) return null;

  const startPct = (trimStart / duration) * 100;
  const endPct = (trimEnd / duration) * 100;
  const playPct = (currentTime / duration) * 100;
  const clipDuration = trimEnd - trimStart;

  return (
    <div className="space-y-2">
      {/* Time labels */}
      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
        <span>{fmt(trimStart)}</span>
        <span className="text-primary font-semibold">{fmt(clipDuration)} clip</span>
        <span>{fmt(trimEnd)}</span>
      </div>

      {/* Timeline bar */}
      <div
        ref={barRef}
        className="relative h-12 bg-secondary/50 rounded-lg cursor-pointer select-none overflow-hidden border border-border"
        onClick={handleBarClick}
      >
        {/* Full track background */}
        <div className="absolute inset-0 bg-secondary/30" />

        {/* Selected region */}
        <div
          className="absolute top-0 bottom-0 bg-primary/20 border-y-2 border-primary/40"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white z-20 pointer-events-none"
          style={{ left: `${playPct}%` }}
        >
          <div className="absolute -top-1 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
        </div>

        {/* Trim start handle */}
        <div
          className="absolute top-0 bottom-0 w-4 z-30 cursor-ew-resize flex items-center justify-center group"
          style={{ left: `calc(${startPct}% - 8px)` }}
          onMouseDown={makeDrag((t) => onTrimStartChange(Math.max(0, Math.min(t, trimEnd - 0.5))))}
          onTouchStart={makeDrag((t) => onTrimStartChange(Math.max(0, Math.min(t, trimEnd - 0.5))))}
        >
          <div className="w-1.5 h-8 bg-primary rounded-full group-hover:bg-primary/80 shadow-lg" />
        </div>

        {/* Trim end handle */}
        <div
          className="absolute top-0 bottom-0 w-4 z-30 cursor-ew-resize flex items-center justify-center group"
          style={{ left: `calc(${endPct}% - 8px)` }}
          onMouseDown={makeDrag((t) => onTrimEndChange(Math.max(trimStart + 0.5, Math.min(t, duration))))}
          onTouchStart={makeDrag((t) => onTrimEndChange(Math.max(trimStart + 0.5, Math.min(t, duration))))}
        >
          <div className="w-1.5 h-8 bg-primary rounded-full group-hover:bg-primary/80 shadow-lg" />
        </div>
      </div>

      {/* Quick duration presets */}
      <div className="flex gap-1.5 flex-wrap">
        {[15, 30, 45, 60, 90].map((sec) => (
          <button
            key={sec}
            disabled={duration < sec}
            onClick={() => {
              const start = Math.min(currentTime, Math.max(0, duration - sec));
              onTrimStartChange(start);
              onTrimEndChange(Math.min(start + sec, duration));
            }}
            className="px-2.5 py-1 text-xs rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {sec}s
          </button>
        ))}
      </div>
    </div>
  );
}
