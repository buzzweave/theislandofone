import { useState, memo } from "react";
import { useGraphicsFolders, useGraphicsFolderImages, type GraphicsFolder } from "@/hooks/useGraphicsFolders";
import { useToast } from "@/hooks/use-toast";
import { Download, FolderOpen, ArrowLeft, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import SmartImage from "@/components/SmartImage";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FolderImageCard = memo(function FolderImageCard({ img }: { img: any }) {
  return (
    <div className="group rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all duration-300">
      <SmartImage
        src={img.file_url}
        alt={img.file_name}
        width={600}
        height={600}
        displayWidth={600}
        widths={[400, 800, 1200]}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        wrapperClassName="aspect-square"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      <div className="p-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{img.file_name}</p>
          <p className="text-[10px] text-muted-foreground">{formatSize(img.file_size)}</p>
        </div>
        <a
          href={img.file_url}
          download={img.file_name}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </a>
      </div>
    </div>
  );
});

export default function PublicGraphicsFolders() {
  const { toast } = useToast();
  const { data: folders = [], isLoading } = useGraphicsFolders();
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);

  const activeFolder = folders.find((f) => f.id === activeFolderId);

  const handleDownloadZip = async (folder: GraphicsFolder) => {
    setZipping(true);
    toast({ title: "Preparing ZIP…" });
    try {
      const { data: folderImages } = await import("@/integrations/supabase/client").then(
        ({ supabase }) => supabase.from("graphics_folder_images").select("id,file_url,file_name").eq("folder_id", folder.id)
      );
      if (!folderImages || folderImages.length === 0) {
        toast({ title: "Folder is empty", variant: "destructive" });
        setZipping(false);
        return;
      }
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      
      // Parallel fetch all images for ZIP (much faster)
      const fetchPromises = folderImages.map(async (img) => {
        try {
          const resp = await fetch(img.file_url);
          const blob = await resp.blob();
          return { name: img.file_name || `image-${img.id}.jpg`, blob };
        } catch { return null; }
      });

      const results = await Promise.all(fetchPromises);
      results.forEach((r) => { if (r) zip.file(r.name, r.blob); });

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folder.name}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "ZIP downloaded" });
    } catch (err: any) {
      toast({ title: "ZIP failed", description: err.message, variant: "destructive" });
    }
    setZipping(false);
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-12">Loading folders…</div>;
  }

  if (activeFolder) {
    return (
      <FolderDetail
        folder={activeFolder}
        onBack={() => setActiveFolderId(null)}
        onDownloadZip={() => handleDownloadZip(activeFolder)}
        zipping={zipping}
      />
    );
  }

  if (folders.length === 0) {
    return (
      <div className="text-center py-16">
        <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No folders available yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto pb-24">
      {folders.map((folder) => (
        <div
          key={folder.id}
          className="group rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all duration-300"
        >
          {folder.cover_image && (
            <div className="aspect-video bg-muted overflow-hidden">
              <img
                src={folder.cover_image}
                alt={folder.name}
                width={600}
                height={338}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          )}
          <div className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-3">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-sm font-semibold group-hover:text-primary transition-colors truncate">
                  {folder.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {folder.image_count ?? 0} image{(folder.image_count ?? 0) !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 min-h-[44px] text-xs"
                onClick={() => setActiveFolderId(folder.id)}
              >
                <FolderOpen className="h-3.5 w-3.5 mr-1.5" /> Open
              </Button>
              <Button
                size="sm"
                className="flex-1 min-h-[44px] text-xs"
                disabled={zipping}
                onClick={() => handleDownloadZip(folder)}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                {zipping ? "Zipping…" : "Download ZIP"}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FolderDetail({
  folder,
  onBack,
  onDownloadZip,
  zipping,
}: {
  folder: GraphicsFolder;
  onBack: () => void;
  onDownloadZip: () => void;
  zipping: boolean;
}) {
  const { data: images = [], isLoading } = useGraphicsFolderImages(folder.id);

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-24">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="min-h-[44px]">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h3 className="font-display text-lg font-semibold">{folder.name}</h3>
        </div>
        <Button size="sm" disabled={zipping || images.length === 0} onClick={onDownloadZip} className="min-h-[44px]">
          <Download className="h-4 w-4 mr-1.5" />
          {zipping ? "Preparing…" : "Download All as ZIP"}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading images…</div>
      ) : images.length === 0 ? (
        <div className="text-center py-16">
          <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">This folder is empty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((img) => (
            <FolderImageCard key={img.id} img={img} />
          ))}
        </div>
      )}
    </div>
  );
}
