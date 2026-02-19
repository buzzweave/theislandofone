import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Sermon {
  id: string;
  title: string;
  scripture: string;
  excerpt: string;
  manuscript: string;
  access_level: string;
  date: string;
  category: string;
  price: number;
  is_free: boolean;
  preview_cutoff: number;
  featured: boolean;
  audio_url: string | null;
  access_tiers: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useSermons() {
  return useQuery({
    queryKey: ["sermons"],
    queryFn: () => api.get<Sermon[]>("/api/sermons"),
  });
}

export function useSermon(id: string | undefined) {
  return useQuery({
    queryKey: ["sermons", id],
    queryFn: () => api.get<Sermon | null>(`/api/sermons/${id}`),
    enabled: !!id,
  });
}

export function useAddSermon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sermon: Omit<Sermon, "id" | "created_at" | "updated_at">) =>
      api.post("/api/sermons", sermon),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sermons"] }),
  });
}

export function useUpdateSermon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<Sermon> & { id: string }) =>
      api.put(`/api/sermons/${id}`, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sermons"] }),
  });
}

export function useDeleteSermon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/sermons/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sermons"] }),
  });
}
