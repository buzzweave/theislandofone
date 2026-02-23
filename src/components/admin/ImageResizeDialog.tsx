import { useState, useRef } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const RESIZE_PRESETS = [
  { label: "OG / Facebook Share", w: 1200, h: 630, platform: "Website & Facebook" },
  { label: "iMessage Preview", w: 1200, h: 630, platform: "Website & Facebook" },
  { label: "Cinematic Master", w: 2400, h: 1260, platform: "Website & Facebook" },
  { label: "Instagram Square", w: 1080, h: 1080, platform: "Instagram" },
  { label: "Instagram Story", w: 1080, h: 1920, platform: "Instagram" },
  { label: "Instagram Reel", w: 1080, h: 1350, platform: "Instagram" },
  { label: "Facebook Cover", w: 820, h: 312, platform: "Facebook Extras" },
  { label: "Facebook Story", w: 1080, h: 1920, platform: "Facebook Extras" },
  { label: "YouTube Thumbnail", w: 1280, h: 720, platform: "YouTube" },
  { label: "YouTube Banner", w: 2560, h: 1440, platform: "YouTube" },
  { label: "Twitter/X Post", w: 1600, h: 900, platform: "Twitter/X" },
  { label: "Twitter/X Header", w: 1500, h: 500, platform: "Twitter/X" },
];

interface ImageResizeDialogProps {
  title: string;
  imageUrl: string | null;
  open: boolean;
  onClose: () => void;
}

export default function ImageResizeDialog({ title, imageUrl, open, onClose }: ImageResizeDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generating, setGenerating] = useState(false);

  const handleResize = async (preset: typeof RESIZE_PRESETS[0]) => {
    if (!imageUrl) return;
    setGenerating(true);
    try {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrl;
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      const canvas = canvasRef.current!;
      canvas.width = preset.w;
      canvas.height = preset.h;
      const ctx = canvas.getContext("2d")!;
      const scale = Math.max(preset.w / img.width, preset.h / img.height);
      const sw = preset.w / scale, sh = preset.h / scale;
      const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, preset.w, preset.h);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title.replace(/\s+/g, "-")}-${preset.label.replace(/\s+/g, "-")}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setGenerating(false);
      }, "image/png");
    } catch {
      setGenerating(false);
    }
  };

  const platforms = [...new Set(RESIZE_PRESETS.map(p => p.platform))];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Resize: {title}</DialogTitle>
        </DialogHeader>
        <canvas ref={canvasRef} className="hidden" />
        <div className="space-y-4">
          {platforms.map(platform => (
            <div key={platform}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{platform}</p>
              <div className="flex flex-wrap gap-2">
                {RESIZE_PRESETS.filter(p => p.platform === platform).map(preset => (
                  <Button key={preset.label} variant="outline" size="sm" disabled={generating} onClick={() => handleResize(preset)} className="text-xs">
                    <Download className="h-3 w-3 mr-1.5" />
                    {preset.label} ({preset.w}×{preset.h})
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
