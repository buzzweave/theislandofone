import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  category: string;
  featured: boolean;
  youtube_url: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useVideos() {
  return useQuery({
    queryKey: ["videos"],
    queryFn: () => api.get<Video[]>("/api/videos"),
  });
}

export function useAddVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (video: Omit<Video, "id" | "created_at" | "updated_at">) =>
      api.post("/api/videos", video),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useUpdateVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<Video> & { id: string }) =>
      api.put(`/api/videos/${id}`, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useDeleteVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/videos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}
