import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/lib/supabaseUpload";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Plus, Trash2, FolderOpen, Image, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface AdminFolder {
  id: string;
  name: string;
  description: string;
  cover_image: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  image_count?: number;
}

function useAdminGraphicsFolders() {
  const queryClient = useQueryClient();

  const { data: folders = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-graphics-folders"],
    queryFn: async () => {
      const { data: rawFolders, error } = await supabase
        .from("graphics_folders")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;

      const folderIds = (rawFolders || []).map((f) => f.id);
      if (folderIds.length === 0) return [];

      const { data: counts } = await supabase
        .from("graphics_folder_images")
        .select("folder_id")
        .in("folder_id", folderIds);

      const countMap: Record<string, number> = {};
      (counts || []).forEach((c) => {
        countMap[c.folder_id] = (countMap[c.folder_id] || 0) + 1;
      });

      return (rawFolders || []).map((f) => ({
        ...f,
        image_count: countMap[f.id] || 0,
      })) as AdminFolder[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-graphics-folders"] });
    queryClient.invalidateQueries({ queryKey: ["graphics-folders"] });
  };

  return { folders, isLoading, refetch, invalidate };
}

export default function AdminGraphicsFoldersTab() {
  const { folders, isLoading, invalidate } = useAdminGraphicsFolders();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [uploadingFolderId, setUploadingFolderId] = useState<string | null>(null);

  const updateFolder = async (id: string, updates: Partial<AdminFolder>) => {
    const { error } = await supabase.from("graphics_folders").update(updates).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      invalidate();
    }
  };

  const createFolder = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("graphics_folders").insert({
      name: newName.trim(),
      is_active: false,
      sort_order: folders.length,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Folder created" });
      setNewName("");
      invalidate();
    }
    setCreating(false);
  };

  const deleteFolder = async (id: string) => {
    const { error } = await supabase.from("graphics_folders").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Folder deleted" });
      invalidate();
    }
  };

  const handleCoverUpload = async (folderId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploadingFolderId(folderId);
      try {
        const url = await uploadToStorage("graphics", file, "folder-covers");
        await updateFolder(folderId, { cover_image: url });
        toast({ title: "Cover image updated" });
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      }
      setUploadingFolderId(null);
    };
    input.click();
  };

  const handleImagesUpload = async (folderId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length === 0) return;
      setUploadingFolderId(folderId);
      let successCount = 0;
      for (let i = 0; i < files.length; i++) {
        try {
          const url = await uploadToStorage("graphics", files[i], `folder-images/${folderId}`);
          const { error } = await supabase.from("graphics_folder_images").insert({
            folder_id: folderId,
            file_url: url,
            file_name: files[i].name,
            file_size: files[i].size,
            sort_order: i,
          });
          if (!error) successCount++;
        } catch { /* skip */ }
      }
      toast({ title: `${successCount} image(s) uploaded` });
      invalidate();
      setUploadingFolderId(null);
    };
    input.click();
  };

  if (isLoading) return <div className="text-muted-foreground py-8 text-center">Loading folders…</div>;

  return (
    <div className="space-y-4 pt-2">
      {/* Create new folder */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="New folder name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createFolder()}
          className="max-w-xs h-10"
        />
        <Button onClick={createFolder} disabled={creating || !newName.trim()} size="sm" className="min-h-[40px]">
          <Plus className="h-4 w-4 mr-1.5" /> Create Folder
        </Button>
      </div>

      {folders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
          No folders yet. Create one above.
        </div>
      ) : (
        <div className="space-y-3">
          {folders.map((folder) => (
            <div key={folder.id} className="rounded-lg border border-border bg-card overflow-hidden">
              {/* Status bar */}
              <div className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider flex items-center justify-between ${folder.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                <span>{folder.is_active ? "Published — Visible on site" : "Draft — Hidden from public"}</span>
              </div>

              <div className="flex flex-col md:flex-row">
                {/* Cover image */}
                <div
                  className="relative w-full md:w-44 aspect-video md:aspect-auto md:h-40 shrink-0 bg-muted overflow-hidden cursor-pointer group"
                  onClick={() => handleCoverUpload(folder.id)}
                  title="Click to change cover image"
                >
                  {folder.cover_image ? (
                    <img src={folder.cover_image} alt={folder.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
                      <Image className="h-8 w-8 opacity-40" />
                      <span className="text-[10px]">Add cover</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Folder Name</Label>
                        <Input
                          className="h-8 text-sm"
                          defaultValue={folder.name}
                          onBlur={(e) => updateFolder(folder.id, { name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input
                          className="h-8 text-sm"
                          defaultValue={folder.description}
                          placeholder="Optional description…"
                          onBlur={(e) => updateFolder(folder.id, { description: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Publish toggle */}
                    <div className="flex items-center gap-2 shrink-0 pt-1">
                      <Switch
                        checked={folder.is_active}
                        onCheckedChange={(checked) => updateFolder(folder.id, { is_active: checked })}
                      />
                      <span className="text-xs font-medium">
                        {folder.is_active ? "Published" : "Draft"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border [&>button]:min-h-[40px]">
                    <span className="text-xs text-muted-foreground">
                      {folder.image_count ?? 0} image{(folder.image_count ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled={uploadingFolderId === folder.id}
                      onClick={() => handleImagesUpload(folder.id)}
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      {uploadingFolderId === folder.id ? "Uploading…" : "Upload Images"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteFolder(folder.id)}
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
  );
}
