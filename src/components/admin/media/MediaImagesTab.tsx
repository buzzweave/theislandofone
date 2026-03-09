import { useState, useCallback, useRef, memo } from "react";
import { useMediaFolders, useMediaImages, useUploadImages, type MediaFolder } from "@/hooks/useMediaLibrary";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { optimizeImage, parallelUpload } from "@/lib/imageOptimizer";
import {
  FolderPlus, Upload, ArrowLeft, Trash2, Download, Pencil, FolderOpen, Image, X, Move,
} from "lucide-react";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ImageCard = memo(function ImageCard({
  img,
  folders,
  movingImageId,
  onMove,
  onDelete,
  setMovingImageId,
}: {
  img: any;
  folders: MediaFolder[];
  movingImageId: string | null;
  onMove: (id: string, folderId: string | null) => void;
  onDelete: (img: any) => void;
  setMovingImageId: (id: string | null) => void;
}) {
  return (
    <div className="group relative rounded-lg overflow-hidden border border-border bg-card">
      <div className="aspect-square bg-muted">
        <img
          src={img.url}
          alt={img.file_name}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="p-2">
        <p className="text-xs font-medium truncate">{img.file_name}</p>
        <p className="text-[10px] text-muted-foreground">{formatSize(img.file_size)}</p>
      </div>
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {movingImageId === img.id ? (
          <div className="bg-card rounded-md shadow-lg border border-border p-2 space-y-1 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
            <button className="w-full text-left text-xs px-2 py-1 hover:bg-muted rounded" onClick={() => onMove(img.id, null)}>
              Root (No folder)
            </button>
            {folders.map((f) => (
              <button key={f.id} className="w-full text-left text-xs px-2 py-1 hover:bg-muted rounded" onClick={() => onMove(img.id, f.id)}>
                {f.name}
              </button>
            ))}
            <button className="w-full text-left text-xs px-2 py-1 hover:bg-muted rounded text-muted-foreground" onClick={() => setMovingImageId(null)}>
              Cancel
            </button>
          </div>
        ) : (
          <>
            <Button variant="secondary" size="sm" className="h-7 w-7 p-0" onClick={() => setMovingImageId(img.id)}>
              <Move className="h-3 w-3" />
            </Button>
            <a href={img.url} download={img.file_name} className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80">
              <Download className="h-3 w-3" />
            </a>
            <Button variant="secondary" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(img)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
});

export default function MediaImagesTab({ orgId }: { orgId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: folders = [], refetch: refetchFolders } = useMediaFolders(orgId);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [movingImageId, setMovingImageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: images = [], refetch: refetchImages } = useMediaImages(
    orgId,
    activeFolderId === null ? undefined : activeFolderId
  );
  const uploadMutation = useUploadImages(orgId);

  const activeFolder = folders.find((f) => f.id === activeFolderId);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const { error } = await supabase.from("media_folders").insert({ org_id: orgId, name: newFolderName.trim() });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewFolderName("");
    setShowNewFolder(false);
    refetchFolders();
    toast({ title: "Folder created" });
  };

  const handleRenameFolder = async (id: string) => {
    if (!renameValue.trim()) return;
    await supabase.from("media_folders").update({ name: renameValue.trim() }).eq("id", id);
    setRenamingId(null);
    refetchFolders();
  };

  const handleDeleteFolder = async (folder: MediaFolder) => {
    const { count } = await supabase.from("media_images").select("id", { count: "exact", head: true }).eq("folder_id", folder.id);
    if ((count || 0) > 0) {
      if (!confirm(`This folder has ${count} image(s). Delete folder and move images to root?`)) return;
      await supabase.from("media_images").update({ folder_id: null }).eq("folder_id", folder.id);
    }
    await supabase.from("media_folders").delete().eq("id", folder.id);
    if (activeFolderId === folder.id) setActiveFolderId(null);
    refetchFolders();
    qc.invalidateQueries({ queryKey: ["media-images"] });
    toast({ title: "Folder deleted" });
  };

  // Optimized parallel upload with client-side compression
  const handleFiles = useCallback(async (files: File[]) => {
    const valid = files.filter((f) => /^image\/(jpeg|jpg|png|webp)$/i.test(f.type));
    if (valid.length === 0) { toast({ title: "No valid images selected", variant: "destructive" }); return; }
    setUploadProgress({ current: 0, total: valid.length });

    try {
      const result = await parallelUpload(
        valid,
        async (file) => {
          // Compress before upload
          const optimized = await optimizeImage(file, { maxWidth: 2400, quality: 0.82 });
          await uploadMutation.mutateAsync({ files: [optimized], folderId: activeFolderId });
        },
        {
          concurrency: 3,
          onProgress: (completed, total) => {
            setUploadProgress({ current: completed, total });
          },
        }
      );
      toast({ title: `${result.successes} image(s) uploaded${result.failures > 0 ? `, ${result.failures} failed` : ""}` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploadProgress(null);
    refetchImages();
  }, [activeFolderId, uploadMutation, toast, refetchImages]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) handleFiles(files);
  };

  const handleDeleteImage = async (img: typeof images[0]) => {
    await supabase.storage.from("workspace-media").remove([img.file_path]);
    await supabase.from("media_images").delete().eq("id", img.id);
    refetchImages();
    toast({ title: "Image deleted" });
  };

  const handleMoveImage = async (imageId: string, folderId: string | null) => {
    await supabase.from("media_images").update({ folder_id: folderId }).eq("id", imageId);
    setMovingImageId(null);
    qc.invalidateQueries({ queryKey: ["media-images"] });
    toast({ title: "Image moved" });
  };

  const handleDownloadZip = async (folder: MediaFolder) => {
    toast({ title: "Preparing ZIP…" });
    const { data: folderImages } = await supabase
      .from("media_images")
      .select("*")
      .eq("folder_id", folder.id);
    if (!folderImages || folderImages.length === 0) {
      toast({ title: "Folder is empty", variant: "destructive" });
      return;
    }

    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    
    // Parallel fetch for ZIP (faster than sequential)
    const fetchPromises = folderImages.map(async (img) => {
      const { data: urlData } = supabase.storage.from("workspace-media").getPublicUrl(img.file_path);
      try {
        const resp = await fetch(urlData.publicUrl);
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
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {activeFolderId && (
            <Button variant="ghost" size="sm" onClick={() => setActiveFolderId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          <h3 className="font-display text-lg font-semibold">
            {activeFolder ? activeFolder.name : "All Images"}
          </h3>
        </div>
        <div className="flex gap-2">
          {!activeFolderId && (
            <Button variant="outline" size="sm" onClick={() => setShowNewFolder(true)}>
              <FolderPlus className="h-4 w-4 mr-1" /> New Folder
            </Button>
          )}
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={!!uploadProgress}>
            <Upload className="h-4 w-4 mr-1" />
            {uploadProgress ? `${uploadProgress.current}/${uploadProgress.total}` : "Upload Images"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) handleFiles(files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {showNewFolder && (
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Folder name…"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            className="max-w-xs"
            autoFocus
          />
          <Button size="sm" onClick={handleCreateFolder}>Create</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowNewFolder(false)}><X className="h-4 w-4" /></Button>
        </div>
      )}

      {uploadProgress && (
        <Progress value={(uploadProgress.current / uploadProgress.total) * 100} className="h-2" />
      )}

      {!activeFolderId && folders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="group rounded-lg border border-border bg-card p-4 cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => { setActiveFolderId(folder.id); }}
            >
              {renamingId === folder.id ? (
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRenameFolder(folder.id)}
                    className="h-7 text-xs"
                    autoFocus
                  />
                  <Button size="sm" className="h-7 text-xs" onClick={() => handleRenameFolder(folder.id)}>Save</Button>
                </div>
              ) : (
                <>
                  <FolderOpen className="h-8 w-8 text-primary mb-2" />
                  <p className="text-sm font-medium truncate">{folder.name}</p>
                  <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setRenamingId(folder.id); setRenameValue(folder.name); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDownloadZip(folder)}>
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteFolder(folder)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div
        className={`rounded-lg border-2 border-dashed p-4 transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border"
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {images.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Image className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Drag & drop images here, or click Upload</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((img) => (
              <ImageCard
                key={img.id}
                img={img}
                folders={folders}
                movingImageId={movingImageId}
                onMove={handleMoveImage}
                onDelete={handleDeleteImage}
                setMovingImageId={setMovingImageId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
