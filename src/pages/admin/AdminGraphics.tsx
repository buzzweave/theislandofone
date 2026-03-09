import { useState, useRef, useCallback } from "react";
import { useAdminGraphics, Graphic } from "@/hooks/useGraphics";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/lib/supabaseUpload";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Eye, EyeOff, Image, Maximize2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import ImageResizeDialog from "@/components/admin/ImageResizeDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import AdminGraphicsFoldersTab from "@/components/admin/graphics/AdminGraphicsFoldersTab";
/** Compress an image file to a smaller preview (max 800px, 70% quality JPEG) */
async function createCompressedPreview(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const MAX = 800;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        const ratio = Math.min(MAX / w, MAX / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        resolve(new File([blob!], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
      }, "image/jpeg", 0.7);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}


export default function AdminGraphics() {
  const { graphics, isLoading, refetch } = useAdminGraphics();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [resizeGraphic, setResizeGraphic] = useState<Graphic | null>(null);
  
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
          const compressed = await createCompressedPreview(files[i]);
          const [previewUrl, fileUrl] = await Promise.all([
            uploadToStorage("graphics", compressed, "previews"),
            uploadToStorage("graphics", files[i], "files"),
          ]);
          const title = files[i].name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
          const { error } = await supabase.from("graphics").insert({
            title,
            preview_url: previewUrl,
            file_url: fileUrl,
            sort_order: graphics.length + i,
            price: 4.99,
            is_active: true,
          });
          if (error) throw new Error(error.message);
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
      const { error } = await supabase.from("graphics").update(updates).eq("id", id);
      if (error) throw new Error(error.message);
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deleteGraphic = async (id: string) => {
    try {
      const { error } = await supabase.from("graphics").delete().eq("id", id);
      if (error) throw new Error(error.message);
      toast({ title: "Graphic deleted" });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Graphics & Media</h2>
        <p className="text-sm text-muted-foreground">Manage store graphics, image library, and video uploads.</p>
      </div>

      <Tabs defaultValue="store" className="w-full">
        <TabsList>
          <TabsTrigger value="store">Store Graphics</TabsTrigger>
          <TabsTrigger value="folders">Folders</TabsTrigger>
        </TabsList>

        {/* Existing store graphics tab */}
        <TabsContent value="store">
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-end">
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
                        <img src={graphic.preview_url} alt={graphic.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
          </div>
        </TabsContent>

        {/* Folders tab */}
        <TabsContent value="folders">
          <AdminGraphicsFoldersTab />
        </TabsContent>

      </Tabs>

      <ImageResizeDialog title={resizeGraphic?.title || ""} imageUrl={resizeGraphic?.preview_url || null} open={!!resizeGraphic} onClose={() => setResizeGraphic(null)} />
    </div>
  );
}
