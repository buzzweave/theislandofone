import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adminFetch } from "@/lib/adminApi";

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

/** Public hook – returns active videos only (RLS enforced) */
export function useVideos() {
  return useQuery({
    queryKey: ["videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Video[];
    },
  });
}

/** Admin hook – calls videos-admin edge function */
export function useAdminVideos() {
  return useQuery({
    queryKey: ["videos", "admin"],
    queryFn: async () => {
      return adminFetch<Video[]>("videos-admin", "GET");
    },
  });
}

export function useAddVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (video: Partial<Video>) => {
      return adminFetch<Video>("videos-admin", "POST", video);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useUpdateVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Video> & { id: string }) => {
      return adminFetch<Video>("videos-admin", "PUT", { id, ...updates });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useDeleteVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await adminFetch("videos-admin", "DELETE", { id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}
