import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  ZoomIn, Volume2, VolumeX, Gauge, Move,
  RectangleVertical, Square, RectangleHorizontal,
} from "lucide-react";

interface Props {
  zoom: number;
  zoomX: number;
  zoomY: number;
  speed: number;
  isMuted: boolean;
  volume: number;
  aspectRatio: "16:9" | "9:16" | "1:1";
  onUpdate: (patch: Record<string, any>) => void;
}

const ASPECT_OPTIONS = [
  { value: "9:16" as const, label: "9:16", icon: RectangleVertical, desc: "Reels / Shorts" },
  { value: "1:1" as const, label: "1:1", icon: Square, desc: "Square Post" },
  { value: "16:9" as const, label: "16:9", icon: RectangleHorizontal, desc: "Landscape" },
];

const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

export default function EditControls({ zoom, zoomX, zoomY, speed, isMuted, volume, aspectRatio, onUpdate }: Props) {
  return (
    <div className="space-y-5">
      {/* Format */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Format</Label>
        <div className="grid grid-cols-3 gap-2">
          {ASPECT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate({ aspectRatio: opt.value })}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-all ${
                aspectRatio === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40"
              }`}
            >
              <opt.icon className="h-4 w-4" />
              <span className="font-semibold">{opt.label}</span>
              <span className="text-[10px] opacity-70">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Zoom */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Zoom — {zoom.toFixed(1)}x
          </Label>
        </div>
        <Slider
          value={[zoom]}
          min={1}
          max={3}
          step={0.1}
          onValueChange={([v]) => onUpdate({ zoom: v })}
        />
        {zoom > 1 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Move className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Pan Position</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-muted-foreground">Horizontal</span>
                <Slider value={[zoomX]} min={0} max={1} step={0.01} onValueChange={([v]) => onUpdate({ zoomX: v })} />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">Vertical</span>
                <Slider value={[zoomY]} min={0} max={1} step={0.01} onValueChange={([v]) => onUpdate({ zoomY: v })} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Speed */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Speed — {speed}x
          </Label>
        </div>
        <div className="flex gap-1 flex-wrap">
          {SPEED_PRESETS.map((s) => (
            <button
              key={s}
              onClick={() => onUpdate({ speed: s })}
              className={`px-2 py-1 text-xs rounded-md transition-all ${
                speed === s
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Audio */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {isMuted ? <VolumeX className="h-3.5 w-3.5 text-muted-foreground" /> : <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />}
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audio</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={!isMuted} onCheckedChange={(v) => onUpdate({ isMuted: !v })} />
          <span className="text-xs text-muted-foreground">{isMuted ? "Muted" : "Sound On"}</span>
        </div>
        {!isMuted && (
          <Slider value={[volume]} min={0} max={1} step={0.05} onValueChange={([v]) => onUpdate({ volume: v })} />
        )}
      </div>
    </div>
  );
}
