import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Video {
  id: string;
  title: string;
  youtube_url: string;
  thumbnail: string;
  duration: string;
  category: string;
  featured: boolean;
  is_active: boolean;
  is_free: boolean;
  price: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Public hook – returns active videos only */
export function useVideos() {
  return useQuery({
    queryKey: ["videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return data as Video[];
    },
  });
}

/** Admin hook – returns all videos */
export function useAdminVideos() {
  return useQuery({
    queryKey: ["videos", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return data as Video[];
    },
  });
}

export function useAddVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (video: Partial<Video>) => {
      const { data, error } = await supabase
        .from("videos")
        .insert({
          title: video.title || "",
          youtube_url: video.youtube_url || "",
          thumbnail: video.thumbnail || "",
          duration: video.duration || "",
          category: video.category || "Ministry",
          featured: !!video.featured,
          is_active: video.is_active !== undefined ? !!video.is_active : true,
          is_free: video.is_free !== undefined ? !!video.is_free : true,
          price: video.price || 0,
          sort_order: video.sort_order || 0,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Video;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useUpdateVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Video> & { id: string }) => {
      const payload: any = { ...updates };
      // Ensure booleans are actual booleans
      if ("featured" in payload) payload.featured = !!payload.featured;
      if ("is_active" in payload) payload.is_active = !!payload.is_active;
      if ("is_free" in payload) payload.is_free = !!payload.is_free;
      
      const { data, error } = await supabase
        .from("videos")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Video;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useDeleteVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("videos").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}
