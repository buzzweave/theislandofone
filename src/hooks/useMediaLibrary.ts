import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MediaFolder {
  id: string;
  org_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  image_count?: number;
}

export interface MediaImage {
  id: string;
  org_id: string;
  folder_id: string | null;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface MediaVideo {
  id: string;
  org_id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
}

function getPublicUrl(path: string) {
  const { data } = supabase.storage.from("workspace-media").getPublicUrl(path);
  return data.publicUrl;
}

export function useMediaFolders(orgId: string | undefined) {
  return useQuery({
    queryKey: ["media-folders", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_folders")
        .select("*, media_images(count)")
        .eq("org_id", orgId!)
        .order("name");
      if (error) throw error;
      return (data as any[]).map((f) => ({
        ...f,
        image_count: f.media_images?.[0]?.count ?? 0,
        media_images: undefined,
      })) as MediaFolder[];
    },
  });
}

export function useMediaImages(orgId: string | undefined, folderId?: string | null) {
  return useQuery({
    queryKey: ["media-images", orgId, folderId],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("media_images")
        .select("*")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false });
      if (folderId === null) {
        q = q.is("folder_id", null);
      } else if (folderId) {
        q = q.eq("folder_id", folderId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data as MediaImage[]).map((img) => ({
        ...img,
        url: getPublicUrl(img.file_path),
      }));
    },
  });
}

export function useMediaVideos(orgId: string | undefined) {
  return useQuery({
    queryKey: ["media-videos", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_videos")
        .select("*")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as MediaVideo[]).map((v) => ({
        ...v,
        url: getPublicUrl(v.file_path),
      }));
    },
  });
}

export function useUploadImages(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ files, folderId }: { files: File[]; folderId?: string | null }) => {
      const results: MediaImage[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${orgId}/images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("workspace-media")
          .upload(path, file, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data, error } = await supabase
          .from("media_images")
          .insert({
            org_id: orgId,
            folder_id: folderId || null,
            file_name: file.name,
            file_path: path,
            file_type: file.type,
            file_size: file.size,
          })
          .select()
          .single();
        if (error) throw error;
        results.push(data as MediaImage);
      }
      return results;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-images"] });
    },
  });
}

export function useUploadVideo(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${orgId}/videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("workspace-media")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const title = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      const { data, error } = await supabase
        .from("media_videos")
        .insert({
          org_id: orgId,
          title,
          file_name: file.name,
          file_path: path,
          file_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();
      if (error) throw error;
      return data as MediaVideo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-videos"] });
    },
  });
}
