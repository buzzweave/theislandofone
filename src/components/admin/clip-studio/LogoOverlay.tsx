import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Upload, Trash2, Image as ImageIcon } from "lucide-react";

interface Props {
  logoUrl: string;
  logoPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  logoScale: number;
  onUpdate: (patch: Record<string, any>) => void;
}

const POSITIONS = [
  { value: "top-left" as const, label: "↖ Top Left" },
  { value: "top-right" as const, label: "↗ Top Right" },
  { value: "bottom-left" as const, label: "↙ Bottom Left" },
  { value: "bottom-right" as const, label: "↘ Bottom Right" },
];

export default function LogoOverlay({ logoUrl, logoPosition, logoScale, onUpdate }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onUpdate({ logoUrl: url });
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Logo Overlay</Label>
      </div>

      {logoUrl ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded bg-secondary/50 p-1" />
            <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => onUpdate({ logoUrl: "" })}>
              <Trash2 className="h-3 w-3 mr-1" /> Remove
            </Button>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground">Position</span>
            <div className="grid grid-cols-2 gap-1.5">
              {POSITIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => onUpdate({ logoPosition: p.value })}
                  className={`px-2 py-1.5 text-[11px] rounded-md transition-all ${
                    logoPosition === p.value
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-secondary/30 text-muted-foreground border border-transparent hover:border-border"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground">Size — {Math.round(logoScale * 100)}%</span>
            <Slider value={[logoScale]} min={0.05} max={0.35} step={0.01} onValueChange={([v]) => onUpdate({ logoScale: v })} />
          </div>
        </div>
      ) : (
        <>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => inputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload Logo
          </Button>
        </>
      )}
    </div>
  );
}
