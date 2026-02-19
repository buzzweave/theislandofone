import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Sermon {
  id: string;
  title: string;
  scripture: string;
  date: string;
  category: string;
  excerpt: string;
  manuscript: string;
  audio_url: string | null;
  featured: number | boolean;
  is_free: number | boolean;
  price: number;
  sort_order: number;
  access_level: string;
  access_tiers: string[];
  preview_cutoff: number;
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
    queryFn: () => api.get<Sermon>(`/api/sermons/${id}`),
    enabled: !!id,
  });
}

export function useAddSermon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sermon: Partial<Sermon>) => api.post<Sermon>("/api/sermons", sermon),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sermons"] }),
  });
}

export function useUpdateSermon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<Sermon> & { id: string }) =>
      api.put<Sermon>(`/api/sermons/${id}`, updates),
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
