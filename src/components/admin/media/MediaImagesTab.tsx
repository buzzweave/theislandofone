import { useState, useCallback, useRef } from "react";
import { useMediaFolders, useMediaImages, useUploadImages, type MediaFolder } from "@/hooks/useMediaLibrary";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  FolderPlus, Upload, ArrowLeft, Trash2, Download, Pencil, FolderOpen, Image, X, Move,
} from "lucide-react";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

  // Create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const { error } = await supabase.from("media_folders").insert({ org_id: orgId, name: newFolderName.trim() });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewFolderName("");
    setShowNewFolder(false);
    refetchFolders();
    toast({ title: "Folder created" });
  };

  // Rename folder
  const handleRenameFolder = async (id: string) => {
    if (!renameValue.trim()) return;
    await supabase.from("media_folders").update({ name: renameValue.trim() }).eq("id", id);
    setRenamingId(null);
    refetchFolders();
  };

  // Delete folder
  const handleDeleteFolder = async (folder: MediaFolder) => {
    // Check if folder has images
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

  // Upload files
  const handleFiles = useCallback(async (files: File[]) => {
    const valid = files.filter((f) => /^image\/(jpeg|jpg|png|webp)$/i.test(f.type));
    if (valid.length === 0) { toast({ title: "No valid images selected", variant: "destructive" }); return; }
    setUploadProgress({ current: 0, total: valid.length });
    try {
      for (let i = 0; i < valid.length; i++) {
        setUploadProgress({ current: i + 1, total: valid.length });
        await uploadMutation.mutateAsync({ files: [valid[i]], folderId: activeFolderId });
      }
      toast({ title: `${valid.length} image(s) uploaded` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploadProgress(null);
    refetchImages();
  }, [activeFolderId, uploadMutation, toast, refetchImages]);

  // Drag & drop
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) handleFiles(files);
  };

  // Delete image
  const handleDeleteImage = async (img: typeof images[0]) => {
    await supabase.storage.from("workspace-media").remove([img.file_path]);
    await supabase.from("media_images").delete().eq("id", img.id);
    refetchImages();
    toast({ title: "Image deleted" });
  };

  // Move image to folder
  const handleMoveImage = async (imageId: string, folderId: string | null) => {
    await supabase.from("media_images").update({ folder_id: folderId }).eq("id", imageId);
    setMovingImageId(null);
    qc.invalidateQueries({ queryKey: ["media-images"] });
    toast({ title: "Image moved" });
  };

  // Download folder as ZIP
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

    // Dynamic import JSZip-like approach using simple blob concat
    // We'll use a simple approach: fetch all images and create a zip using the browser
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (const img of folderImages) {
      const { data: urlData } = supabase.storage.from("workspace-media").getPublicUrl(img.file_path);
      try {
        const resp = await fetch(urlData.publicUrl);
        const blob = await resp.blob();
        zip.file(img.file_name || `image-${img.id}.jpg`, blob);
      } catch { /* skip failed */ }
    }
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
      {/* Header */}
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

      {/* New folder input */}
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

      {/* Upload progress */}
      {uploadProgress && (
        <Progress value={(uploadProgress.current / uploadProgress.total) * 100} className="h-2" />
      )}

      {/* Folders grid (only when not inside a folder) */}
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

      {/* Drop zone & images grid */}
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
              <div key={img.id} className="group relative rounded-lg overflow-hidden border border-border bg-card">
                <div className="aspect-square bg-muted">
                  <img
                    src={(img as any).url}
                    alt={img.file_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{img.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">{formatSize(img.file_size)}</p>
                </div>
                {/* Actions overlay */}
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {movingImageId === img.id ? (
                    <div className="bg-card rounded-md shadow-lg border border-border p-2 space-y-1 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                      <button className="w-full text-left text-xs px-2 py-1 hover:bg-muted rounded" onClick={() => handleMoveImage(img.id, null)}>
                        Root (No folder)
                      </button>
                      {folders.map((f) => (
                        <button key={f.id} className="w-full text-left text-xs px-2 py-1 hover:bg-muted rounded" onClick={() => handleMoveImage(img.id, f.id)}>
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
                      <a href={(img as any).url} download={img.file_name} className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80">
                        <Download className="h-3 w-3" />
                      </a>
                      <Button variant="secondary" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteImage(img)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
