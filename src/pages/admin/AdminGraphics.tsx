import { useState, useRef } from "react";
import { useAdminGraphics, Graphic } from "@/hooks/useGraphics";
import { adminFetch } from "@/lib/adminApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Eye, EyeOff, Image, Maximize2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const RESIZE_PRESETS = [
  { label: "Instagram Post", w: 1080, h: 1080, platform: "Instagram" },
  { label: "Instagram Story", w: 1080, h: 1920, platform: "Instagram" },
  { label: "Instagram Reel", w: 1080, h: 1350, platform: "Instagram" },
  { label: "Facebook Post", w: 1200, h: 630, platform: "Facebook" },
  { label: "Facebook Cover", w: 820, h: 312, platform: "Facebook" },
  { label: "Facebook Story", w: 1080, h: 1920, platform: "Facebook" },
  { label: "YouTube Thumbnail", w: 1280, h: 720, platform: "YouTube" },
  { label: "YouTube Banner", w: 2560, h: 1440, platform: "YouTube" },
  { label: "Twitter/X Post", w: 1600, h: 900, platform: "Twitter/X" },
  { label: "Twitter/X Header", w: 1500, h: 500, platform: "Twitter/X" },
];

function ResizeDialog({ graphic, open, onClose }: { graphic: Graphic | null; open: boolean; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generating, setGenerating] = useState(false);

  const handleResize = async (preset: typeof RESIZE_PRESETS[0]) => {
    if (!graphic) return;
    setGenerating(true);
    try {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = graphic.preview_url;
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
        a.download = `${graphic.title.replace(/\s+/g, "-")}-${preset.label.replace(/\s+/g, "-")}.png`;
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
          <DialogTitle>Resize: {graphic?.title}</DialogTitle>
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

export default function AdminGraphics() {
  const { graphics, isLoading, refetch } = useAdminGraphics();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [resizeGraphic, setResizeGraphic] = useState<Graphic | null>(null);

  const uploadFile = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "png";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("graphics").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("graphics").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleAddClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length === 0) return;
      setUploading(true);
      setUploadProgress({ current: 0, total: files.length });
      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i + 1, total: files.length });
        try {
          const publicUrl = await uploadFile(files[i]);
          const title = files[i].name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
          await adminFetch("graphics-admin", "POST", {
            title,
            preview_url: publicUrl,
            file_url: publicUrl,
            sort_order: graphics.length + i,
            price: 4.99,
          });
        } catch (err: any) {
          console.error("Graphics upload failed:", err);
          toast({ title: "Upload failed", description: `${files[i].name}: ${err.message}`, variant: "destructive" });
        }
      }
      toast({ title: `${files.length} graphic(s) uploaded` });
      refetch();
      setUploading(false);
      setUploadProgress(null);
    };
    input.click();
  };

  const updateGraphic = async (id: string, updates: Partial<Graphic>) => {
    try {
      await adminFetch("graphics-admin", "PUT", { id, ...updates });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deleteGraphic = async (id: string) => {
    try {
      await adminFetch("graphics-admin", "DELETE", { id });
      toast({ title: "Graphic deleted" });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Graphics</h2>
          <p className="text-sm text-muted-foreground">Upload and manage church screen graphics for purchase.</p>
        </div>
        <Button onClick={handleAddClick} disabled={uploading} size="lg" className="min-h-[48px] px-6">
          <Plus className="h-5 w-5 mr-2" />
          {uploading && uploadProgress
            ? `Uploading ${uploadProgress.current} of ${uploadProgress.total}…`
            : "Add Graphics"}
        </Button>
      </div>

      {graphics.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          <Image className="h-10 w-10 mx-auto mb-3 opacity-50" />
          No graphics yet. Add one to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {graphics.map((graphic) => (
            <div key={graphic.id} className="rounded-lg border border-border bg-card overflow-hidden">
              <div className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider flex items-center justify-between ${graphic.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                <span className="flex items-center gap-1.5">
                  {graphic.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {graphic.is_active ? "Published — Live on site" : "Draft — Hidden from public"}
                </span>
              </div>
              <div className="flex flex-col md:flex-row">
                <div className="relative w-full md:w-56 aspect-video md:aspect-auto md:h-48 shrink-0 bg-muted overflow-hidden">
                  <img src={graphic.preview_url} alt={graphic.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 p-4 space-y-3">
                  <div className="flex-1 space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Title</Label>
                      <Input className="h-8 text-sm" defaultValue={graphic.title} onBlur={(e) => updateGraphic(graphic.id, { title: e.target.value })} />
                    </div>
                    <div className="flex gap-2">
                      <div className="space-y-1 flex-1">
                        <Label className="text-xs">Category</Label>
                        <Input className="h-8 text-sm" defaultValue={graphic.category} onBlur={(e) => updateGraphic(graphic.id, { category: e.target.value })} />
                      </div>
                      <div className="space-y-1 w-28">
                        <Label className="text-xs">Price ($)</Label>
                        <Input type="number" step="0.01" className="h-8 text-sm" defaultValue={graphic.price} onBlur={(e) => updateGraphic(graphic.id, { price: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input className="h-8 text-sm" defaultValue={graphic.description} onBlur={(e) => updateGraphic(graphic.id, { description: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Membership Access</Label>
                      <div className="flex flex-wrap gap-2">
                        {(["reader", "pastor", "inner-circle"] as const).map((tier) => {
                          const tiers = graphic.access_tiers || [];
                          const checked = tiers.includes(tier);
                          const label = tier === "inner-circle" ? "Inner Circle" : tier.charAt(0).toUpperCase() + tier.slice(1);
                          return (
                            <button
                              key={tier}
                              onClick={() => {
                                const next = checked ? tiers.filter((t: string) => t !== tier) : [...tiers, tier];
                                updateGraphic(graphic.id, { access_tiers: next });
                              }}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                                checked
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-card text-muted-foreground border-border hover:border-primary/40"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border [&>button]:min-h-[44px]">
                    <Button
                      variant={graphic.is_active ? "outline" : "default"}
                      size="sm"
                      onClick={() => updateGraphic(graphic.id, { is_active: !graphic.is_active })}
                      className="text-xs"
                    >
                      {graphic.is_active ? <><EyeOff className="h-3.5 w-3.5 mr-1.5" /> Unpublish (Draft)</> : <><Eye className="h-3.5 w-3.5 mr-1.5" /> Publish to Site</>}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setResizeGraphic(graphic)}
                      className="text-xs"
                    >
                      <Maximize2 className="h-3.5 w-3.5 mr-1.5" /> Resize for Social Media
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteGraphic(graphic.id)}
                      className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 ml-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <ResizeDialog graphic={resizeGraphic} open={!!resizeGraphic} onClose={() => setResizeGraphic(null)} />
    </div>
  );
}
