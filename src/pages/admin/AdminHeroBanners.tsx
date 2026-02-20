import { useState, useRef } from "react";
import { useAdminHeroBanners, HeroBanner } from "@/hooks/useHeroBanners";
import { useSiteLogo } from "@/hooks/useSiteLogo";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/lib/supabaseUpload";
import { Plus, Trash2, GripVertical, Upload, Eye, EyeOff, Image, X, Droplets, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableBannerItem({
  banner,
  idx,
  updateBanner,
  deleteBanner,
  replaceImage,
}: {
  banner: HeroBanner;
  idx: number;
  updateBanner: (id: string, updates: Partial<HeroBanner>) => Promise<void>;
  deleteBanner: (id: string) => Promise<void>;
  replaceImage: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: banner.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex flex-col md:flex-row">
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

        <div className="flex-1 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <button
              {...attributes}
              {...listeners}
              className="flex items-center gap-2 text-muted-foreground cursor-grab active:cursor-grabbing hover:text-foreground transition-colors"
            >
              <GripVertical className="h-4 w-4" />
              <span className="text-xs">Slide {idx + 1}</span>
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateBanner(banner.id, { is_active: !banner.is_active })}
                className={`p-1.5 rounded text-xs ${banner.is_active ? "text-primary" : "text-muted-foreground"}`}
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
        </div>
      </div>
    </div>
  );
}

function LogoUploadSection() {
  const { logoUrl, updateLogo } = useSiteLogo();
  const { value: logoSize, updateValue: updateLogoSize } = useSiteSettings("logo_size", "28");
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const url = await uploadToStorage("site-assets", file, "logos");
        await updateLogo(url);
        toast({ title: "Logo updated!" });
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const removeLogo = async () => {
    try {
      await updateLogo("");
      toast({ title: "Logo removed — using default icon" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <Image className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-display text-sm font-semibold">Site Logo</h3>
          <p className="text-xs text-muted-foreground">
            This logo appears in the navigation bar and footer across the entire website.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="Current logo" className="w-full h-full object-contain p-1" />
          ) : (
            <span className="text-xs text-muted-foreground text-center px-1">No logo</span>
          )}
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <button
            onClick={handleLogoUpload}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 w-fit"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Uploading…" : logoUrl ? "Replace Logo" : "Upload Logo"}
          </button>
          {logoUrl && (
            <button
              onClick={removeLogo}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors w-fit"
            >
              <X className="h-3.5 w-3.5" /> Remove Logo
            </button>
          )}
          <div className="mt-2">
            <label className="text-xs text-muted-foreground block mb-1">
              Logo Size: {logoSize}px
            </label>
            <input
              type="range"
              min="16"
              max="64"
              step="2"
              value={parseInt(logoSize) || 28}
              onChange={(e) => updateLogoSize(e.target.value)}
              className="w-full max-w-[200px] accent-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function WatermarkSection() {
  const { value: watermarkUrl, updateValue: updateWatermark } = useSiteSettings("watermark_url");
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/svg+xml,image/webp";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const url = await uploadToStorage("site-assets", file, "watermarks");
        await updateWatermark(url);
        toast({ title: "Watermark uploaded!" });
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <Droplets className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-display text-sm font-semibold">Graphics Watermark</h3>
          <p className="text-xs text-muted-foreground">
            Upload a watermark (PNG with transparency recommended). It overlays on graphic previews but is removed when customers download.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {watermarkUrl ? (
            <img src={watermarkUrl} alt="Watermark" className="w-full h-full object-contain p-1" />
          ) : (
            <span className="text-xs text-muted-foreground text-center px-1">None</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Uploading…" : watermarkUrl ? "Replace Watermark" : "Upload Watermark"}
          </button>
          {watermarkUrl && (
            <button
              onClick={async () => {
                await updateWatermark("");
                toast({ title: "Watermark removed" });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Remove Watermark
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FacebookShareImageSection() {
  const { value: shareImageUrl, updateValue: updateShareImage } = useSiteSettings("og_share_image");
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const url = await uploadToStorage("site-assets", file, "og-images");
        await updateShareImage(url);
        toast({ title: "Share image updated!" });
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <Share2 className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-display text-sm font-semibold">Facebook Share Image</h3>
          <p className="text-xs text-muted-foreground">
            This is the default image Facebook uses when someone shares your site. Recommended: 1200×630px. Upload promotional book covers or branded images here.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-32 h-20 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {shareImageUrl ? (
            <img src={shareImageUrl} alt="Share preview" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-muted-foreground text-center px-1">No image</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Uploading…" : shareImageUrl ? "Replace Image" : "Upload Image"}
          </button>
          {shareImageUrl && (
            <button
              onClick={async () => {
                await updateShareImage("");
                toast({ title: "Share image removed" });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Remove Image
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminHeroBanners() {
  const { banners, isLoading } = useAdminHeroBanners();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["hero-banners"] });

  const addBanner = async () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToStorage("hero-banners", file);
      const { error } = await supabase.from("hero_banners").insert({
        title: "New Banner",
        subtitle: "",
        image_url: url,
        sort_order: banners.length,
      });
      if (error) throw new Error(error.message);
      toast({ title: "Banner added" });
      invalidate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setUploading(false);
    e.target.value = "";
  };

  const updateBanner = async (id: string, updates: Partial<HeroBanner>) => {
    try {
      const { error } = await supabase.from("hero_banners").update(updates).eq("id", id);
      if (error) throw new Error(error.message);
      invalidate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deleteBanner = async (id: string) => {
    try {
      const { error } = await supabase.from("hero_banners").delete().eq("id", id);
      if (error) throw new Error(error.message);
      toast({ title: "Banner deleted" });
      invalidate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const replaceImage = (id: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const url = await uploadToStorage("hero-banners", file);
        await updateBanner(id, { image_url: url });
        toast({ title: "Image updated" });
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      }
      setUploading(false);
    };
    input.click();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = banners.findIndex((b) => b.id === active.id);
    const newIndex = banners.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(banners, oldIndex, newIndex);

    queryClient.setQueryData(["hero-banners"], reordered);

    const updates = reordered.map((b, i) =>
      supabase.from("hero_banners").update({ sort_order: i }).eq("id", b.id)
    );
    await Promise.all(updates);
    invalidate();
    toast({ title: "Order updated" });
  };

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <LogoUploadSection />
      <FacebookShareImageSection />
      <WatermarkSection />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Hero Banners</h2>
          <p className="text-sm text-muted-foreground">Drag to reorder. Changes save automatically.</p>
        </div>
        <button
          onClick={addBanner}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {uploading ? "Uploading…" : "Add Banner"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
      </div>

      {banners.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          No hero banners yet. Add one to get started.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={banners.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {banners.map((banner, idx) => (
                <SortableBannerItem
                  key={banner.id}
                  banner={banner}
                  idx={idx}
                  updateBanner={updateBanner}
                  deleteBanner={deleteBanner}
                  replaceImage={replaceImage}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
