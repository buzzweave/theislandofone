import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExperienceSeries {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  artwork_url: string | null;
  trailer_url: string | null;
  order_index: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useExperienceSeriesList(options?: { publishedOnly?: boolean }) {
  return useQuery({
    queryKey: ["experience_series", { publishedOnly: !!options?.publishedOnly }],
    queryFn: async () => {
      let q = (supabase as any).from("experience_series").select("*").order("order_index", { ascending: true });
      if (options?.publishedOnly) q = q.eq("status", "published");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ExperienceSeries[];
    },
  });
}

export function useSeriesBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["experience_series", "slug", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("experience_series")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as ExperienceSeries | null;
    },
  });
}

export function useCreateSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ExperienceSeries>) => {
      const { data, error } = await (supabase as any)
        .from("experience_series")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data as ExperienceSeries;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["experience_series"] }),
  });
}

export function useUpdateSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ExperienceSeries> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("experience_series")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as ExperienceSeries;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["experience_series"] }),
  });
}

export function useDeleteSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("experience_series").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["experience_series"] }),
  });
}
