import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHeroBanners, HeroBanner } from "@/hooks/useHeroBanners";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, GripVertical, Upload, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminHeroBanners() {
  const { banners, isLoading } = useHeroBanners();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["hero-banners"] });

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("hero-banners").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    const { data } = supabase.storage.from("hero-banners").getPublicUrl(path);
    return data.publicUrl;
  };

  const addBanner = async () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadImage(file);
    if (url) {
      const { error } = await supabase.from("hero_banners").insert({
        title: "New Banner",
        subtitle: "",
        image_url: url,
        sort_order: banners.length,
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Banner added" });
        invalidate();
      }
    }
    setUploading(false);
    e.target.value = "";
  };

  const updateBanner = async (id: string, updates: Partial<HeroBanner>) => {
    const { error } = await supabase.from("hero_banners").update(updates).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      invalidate();
    }
  };

  const deleteBanner = async (id: string) => {
    const { error } = await supabase.from("hero_banners").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Banner deleted" });
      invalidate();
    }
  };

  const replaceImage = async (id: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      const url = await uploadImage(file);
      if (url) {
        await updateBanner(id, { image_url: url });
        toast({ title: "Image updated" });
      }
      setUploading(false);
    };
    input.click();
  };

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Hero Banners</h2>
          <p className="text-sm text-muted-foreground">Manage the scrollable hero carousel on the homepage.</p>
        </div>
        <button
          onClick={addBanner}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add Banner
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
      </div>

      {banners.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          No hero banners yet. Add one to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {banners.map((banner, idx) => (
            <div key={banner.id} className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Image preview */}
                <div className="relative w-full md:w-72 aspect-video md:aspect-auto md:h-48 shrink-0 bg-muted overflow-hidden group">
                  {banner.image_url ? (
                    <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                      No image
                    </div>
                  )}
                  <button
                    onClick={() => replaceImage(banner.id)}
                    className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Upload className="h-4 w-4" /> Replace Image
                  </button>
                </div>

                {/* Fields */}
                <div className="flex-1 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                      <span className="text-xs">Slide {idx + 1}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateBanner(banner.id, { is_active: !banner.is_active })}
                        className={`p-1.5 rounded text-xs ${banner.is_active ? "text-green-500" : "text-muted-foreground"}`}
                        title={banner.is_active ? "Active" : "Inactive"}
                      >
                        {banner.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => deleteBanner(banner.id)}
                        className="p-1.5 rounded text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <input
                    className="w-full px-3 py-2 rounded-md bg-muted border border-border text-sm text-foreground"
                    placeholder="Title"
                    defaultValue={banner.title}
                    onBlur={(e) => updateBanner(banner.id, { title: e.target.value })}
                  />
                  <input
                    className="w-full px-3 py-2 rounded-md bg-muted border border-border text-sm text-foreground"
                    placeholder="Subtitle"
                    defaultValue={banner.subtitle}
                    onBlur={(e) => updateBanner(banner.id, { subtitle: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-3 py-2 rounded-md bg-muted border border-border text-sm text-foreground"
                      placeholder="Button text"
                      defaultValue={banner.cta_text || ""}
                      onBlur={(e) => updateBanner(banner.id, { cta_text: e.target.value })}
                    />
                    <input
                      className="flex-1 px-3 py-2 rounded-md bg-muted border border-border text-sm text-foreground"
                      placeholder="Button link (/books)"
                      defaultValue={banner.cta_link || ""}
                      onBlur={(e) => updateBanner(banner.id, { cta_link: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="text-xs text-muted-foreground">Order:</label>
                    <input
                      type="number"
                      className="w-20 px-3 py-1.5 rounded-md bg-muted border border-border text-sm text-foreground"
                      defaultValue={banner.sort_order}
                      onBlur={(e) => updateBanner(banner.id, { sort_order: parseInt(e.target.value) || 0 })}
                    />
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
