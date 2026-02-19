import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

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

function normalize(raw: any[]): Video[] {
  return raw.map((v: any) => ({
    ...v,
    price: Number(v.price) || 0,
    featured: v.featured === 1 || v.featured === true,
    is_active: v.is_active === 1 || v.is_active === true,
    is_free: v.is_free === 1 || v.is_free === true,
  }));
}

/** Public hook – returns active videos only */
export function useVideos() {
  return useQuery({
    queryKey: ["videos"],
    queryFn: async () => {
      const raw = await api.get<any[]>("/api/videos");
      return normalize(raw).filter((v) => v.is_active);
    },
  });
}

/** Admin hook – returns all videos */
export function useAdminVideos() {
  return useQuery({
    queryKey: ["videos", "admin"],
    queryFn: async () => {
      const raw = await api.get<any[]>("/api/videos");
      return normalize(raw);
    },
  });
}

export function useAddVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (video: Partial<Video>) => {
      return api.post<Video>("/api/videos", {
        ...video,
        featured: video.featured ? 1 : 0,
        is_active: (video as any).is_active ? 1 : 0,
        is_free: video.is_free ? 1 : 0,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useUpdateVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Video> & { id: string }) => {
      const payload: any = { ...updates };
      if ("featured" in updates) payload.featured = updates.featured ? 1 : 0;
      if ("is_active" in updates) payload.is_active = updates.is_active ? 1 : 0;
      if ("is_free" in updates) payload.is_free = updates.is_free ? 1 : 0;
      return api.put<Video>(`/api/videos/${id}`, payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useDeleteVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/videos/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}
