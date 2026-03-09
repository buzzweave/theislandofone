import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GraphicsFolder {
  id: string;
  name: string;
  cover_image: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  image_count?: number;
}

export interface GraphicsFolderImage {
  id: string;
  folder_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  sort_order: number;
  created_at: string;
}

export function useGraphicsFolders() {
  return useQuery({
    queryKey: ["graphics-folders"],
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      // Use count aggregation to avoid fetching all image rows
      const { data: folders, error } = await supabase
        .from("graphics_folders")
        .select("id,name,cover_image,description,is_active,sort_order,created_at")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      const folderIds = (folders || []).map((f) => f.id);
      if (folderIds.length === 0) return [];

      // Get counts efficiently - only select folder_id
      const { data: counts } = await supabase
        .from("graphics_folder_images")
        .select("folder_id")
        .in("folder_id", folderIds);

      const countMap: Record<string, number> = {};
      (counts || []).forEach((c) => {
        countMap[c.folder_id] = (countMap[c.folder_id] || 0) + 1;
      });

      return (folders || []).map((f) => ({
        ...f,
        image_count: countMap[f.id] || 0,
      })) as GraphicsFolder[];
    },
  });
}

export function useGraphicsFolderImages(folderId: string | null) {
  return useQuery({
    queryKey: ["graphics-folder-images", folderId],
    enabled: !!folderId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("graphics_folder_images")
        .select("id,folder_id,file_name,file_url,file_size,sort_order")
        .eq("folder_id", folderId!)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data || []) as GraphicsFolderImage[];
    },
  });
}
