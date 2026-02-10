import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useSermons() {
  return useQuery({
    queryKey: ["sermons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sermons")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Sermon[];
    },
  });
}

export function useSermon(id: string | undefined) {
  return useQuery({
    queryKey: ["sermons", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sermons")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as Sermon | null;
    },
    enabled: !!id,
  });
}

export function useAddSermon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sermon: Omit<Sermon, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase.from("sermons").insert(sermon).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sermons"] }),
  });
}

export function useUpdateSermon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Sermon> & { id: string }) => {
      const { data, error } = await supabase
        .from("sermons")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sermons"] }),
  });
}

export function useDeleteSermon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sermons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sermons"] }),
  });
}
