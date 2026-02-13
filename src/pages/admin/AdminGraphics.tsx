import { useState, useRef, useEffect, useCallback } from "react";
import { useGraphics, Graphic } from "@/hooks/useGraphics";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Eye, EyeOff, Image, Maximize2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

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

function getAdminToken(): string {
  return localStorage.getItem("admin_token") || "";
}

async function adminApi(method: string, body?: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/graphics-admin`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": getAdminToken(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

async function uploadToStorage(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("graphics").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("graphics").getPublicUrl(path);
  return data.publicUrl;
}

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
  const { graphics, isLoading } = useGraphics();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [allGraphics, setAllGraphics] = useState<Graphic[]>([]);
  const [loadingAll, setLoadingAll] = useState(true);

  // Fetch all graphics (including inactive) via admin edge function
  const fetchAll = useCallback(async () => {
    setLoadingAll(true);
    try {
      const data = await adminApi("GET");
      setAllGraphics(data);
    } catch {
      setAllGraphics(graphics);
    }
    setLoadingAll(false);
  }, [graphics]);

  useEffect(() => { fetchAll(); }, []);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["graphics"] });
    fetchAll();
  };

  const addGraphic = async (previewFile: File, downloadFile: File) => {
    setUploading(true);
    try {
      const [previewUrl, fileUrl] = await Promise.all([
        uploadToStorage(previewFile, "previews"),
        uploadToStorage(downloadFile, "files"),
      ]);
      await adminApi("POST", {
        title: previewFile.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
        preview_url: previewUrl,
        file_url: fileUrl,
        sort_order: allGraphics.length,
        price: 4.99,
      });
      toast({ title: "Graphic added" });
      invalidate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const updateGraphic = async (id: string, updates: Partial<Graphic>) => {
    try {
      await adminApi("PUT", { id, ...updates });
      invalidate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deleteGraphic = async (id: string) => {
    try {
      await adminApi("DELETE", { id });
      toast({ title: "Graphic deleted" });
      invalidate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAddClick = () => {
    const previewInput = document.createElement("input");
    previewInput.type = "file";
    previewInput.accept = "image/*";
    previewInput.onchange = (e) => {
      const previewFile = (e.target as HTMLInputElement).files?.[0];
      if (!previewFile) return;
      const downloadInput = document.createElement("input");
      downloadInput.type = "file";
      downloadInput.accept = "image/*,.zip,.psd,.ai,.svg,.pdf";
      downloadInput.onchange = (e2) => {
        const downloadFile = (e2.target as HTMLInputElement).files?.[0];
        if (!downloadFile) return;
        addGraphic(previewFile, downloadFile);
      };
      downloadInput.click();
    };
    previewInput.click();
  };

  const [resizeGraphic, setResizeGraphic] = useState<Graphic | null>(null);
  const displayGraphics = loadingAll ? [] : allGraphics;

  if (loadingAll) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Graphics</h2>
          <p className="text-sm text-muted-foreground">Upload and manage church screen graphics for purchase.</p>
        </div>
        <Button onClick={handleAddClick} disabled={uploading}>
          <Plus className="h-4 w-4 mr-2" />
          {uploading ? "Uploading…" : "Add Graphic"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        When adding: first select the preview image, then select the downloadable file (high-res image, PSD, ZIP, etc.)
      </p>

      {displayGraphics.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          <Image className="h-10 w-10 mx-auto mb-3 opacity-50" />
          No graphics yet. Add one to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {displayGraphics.map((graphic) => (
            <div key={graphic.id} className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="relative w-full md:w-56 aspect-video md:aspect-auto md:h-40 shrink-0 bg-muted overflow-hidden">
                  <img src={graphic.preview_url} alt={graphic.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
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
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <button onClick={() => setResizeGraphic(graphic)} className="p-1.5 rounded text-muted-foreground hover:text-primary" title="Resize for social media">
                        <Maximize2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => updateGraphic(graphic.id, { is_active: !graphic.is_active })} className={`p-1.5 rounded text-xs ${graphic.is_active ? "text-primary" : "text-muted-foreground"}`} title={graphic.is_active ? "Active (Published)" : "Draft (Hidden)"}>
                        {graphic.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button onClick={() => deleteGraphic(graphic.id)} className="p-1.5 rounded text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
