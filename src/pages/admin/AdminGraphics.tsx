import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGraphics, Graphic } from "@/hooks/useGraphics";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload, Eye, EyeOff, Image } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function AdminGraphics() {
  const { graphics, isLoading } = useGraphics();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["graphics"] });

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("graphics").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    const { data } = supabase.storage.from("graphics").getPublicUrl(path);
    return data.publicUrl;
  };

  const addGraphic = async (previewFile: File, downloadFile: File) => {
    setUploading(true);
    const [previewUrl, fileUrl] = await Promise.all([
      uploadFile(previewFile, "previews"),
      uploadFile(downloadFile, "files"),
    ]);
    if (previewUrl && fileUrl) {
      const { error } = await supabase.from("graphics").insert({
        title: previewFile.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
        preview_url: previewUrl,
        file_url: fileUrl,
        sort_order: graphics.length,
        price: 4.99,
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Graphic added" });
        invalidate();
      }
    }
    setUploading(false);
  };

  const updateGraphic = async (id: string, updates: Partial<Graphic>) => {
    const { error } = await supabase.from("graphics").update(updates).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      invalidate();
    }
  };

  const deleteGraphic = async (id: string) => {
    const { error } = await supabase.from("graphics").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Graphic deleted" });
      invalidate();
    }
  };

  const handleAddClick = () => {
    // Create a two-step file picker: preview then download file
    const previewInput = document.createElement("input");
    previewInput.type = "file";
    previewInput.accept = "image/*";
    previewInput.onchange = (e) => {
      const previewFile = (e.target as HTMLInputElement).files?.[0];
      if (!previewFile) return;
      // Now ask for the download file
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

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;

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

      {graphics.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          <Image className="h-10 w-10 mx-auto mb-3 opacity-50" />
          No graphics yet. Add one to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {graphics.map((graphic) => (
            <div key={graphic.id} className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Preview */}
                <div className="relative w-full md:w-56 aspect-video md:aspect-auto md:h-40 shrink-0 bg-muted overflow-hidden">
                  <img src={graphic.preview_url} alt={graphic.title} className="w-full h-full object-cover" />
                </div>

                {/* Fields */}
                <div className="flex-1 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Title</Label>
                        <Input
                          className="h-8 text-sm"
                          defaultValue={graphic.title}
                          onBlur={(e) => updateGraphic(graphic.id, { title: e.target.value })}
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="space-y-1 flex-1">
                          <Label className="text-xs">Category</Label>
                          <Input
                            className="h-8 text-sm"
                            defaultValue={graphic.category}
                            onBlur={(e) => updateGraphic(graphic.id, { category: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1 w-28">
                          <Label className="text-xs">Price ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            className="h-8 text-sm"
                            defaultValue={graphic.price}
                            onBlur={(e) => updateGraphic(graphic.id, { price: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input
                          className="h-8 text-sm"
                          defaultValue={graphic.description}
                          onBlur={(e) => updateGraphic(graphic.id, { description: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => updateGraphic(graphic.id, { is_active: !graphic.is_active })}
                        className={`p-1.5 rounded text-xs ${graphic.is_active ? "text-primary" : "text-muted-foreground"}`}
                        title={graphic.is_active ? "Active" : "Inactive"}
                      >
                        {graphic.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => deleteGraphic(graphic.id)}
                        className="p-1.5 rounded text-destructive hover:bg-destructive/10"
                      >
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
    </div>
  );
}
