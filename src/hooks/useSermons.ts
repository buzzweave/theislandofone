import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  access_tiers: string[] | string;
  preview_cutoff: number;
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
      if (error) throw new Error(error.message);
      return data as Sermon[];
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
        .single();
      if (error) throw new Error(error.message);
      return data as Sermon;
    },
    enabled: !!id,
  });
}

export function useAddSermon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sermon: Partial<Sermon>) => {
      const payload: any = { ...sermon };
      // Normalize booleans for DB
      if ("featured" in payload) payload.featured = !!payload.featured;
      if ("is_free" in payload) payload.is_free = payload.is_free === 1 || payload.is_free === true;
      // Ensure audio_url is null not empty string
      if (!payload.audio_url) payload.audio_url = null;
      // Handle access_tiers - ensure it's an array
      if ("access_tiers" in payload) {
        if (typeof payload.access_tiers === "string") {
          payload.access_tiers = payload.access_tiers.split(",").filter(Boolean);
        }
      } else {
        payload.access_tiers = [];
      }
      
      const { data, error } = await supabase
        .from("sermons")
        .insert(payload)
        .select()
        .single();
      if (error) {
        console.error("Sermon insert error:", error);
        throw new Error(error.message);
      }
      return data as Sermon;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sermons"] }),
  });
}

export function useUpdateSermon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Sermon> & { id: string }) => {
      const payload: any = { ...updates };
      // Normalize booleans
      if ("featured" in payload) payload.featured = payload.featured === 1 || payload.featured === true;
      if ("is_free" in payload) payload.is_free = payload.is_free === 1 || payload.is_free === true;
      // Ensure audio_url is null not empty string
      if ("audio_url" in payload && !payload.audio_url) payload.audio_url = null;
      // Handle access_tiers - ensure it's an array
      if ("access_tiers" in payload) {
        if (typeof payload.access_tiers === "string") {
          payload.access_tiers = payload.access_tiers.split(",").filter(Boolean);
        }
      }
      
      const { data, error } = await supabase
        .from("sermons")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        console.error("Sermon update error:", error);
        throw new Error(error.message);
      }
      return data as Sermon;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sermons"] }),
  });
}

export function useDeleteSermon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sermons").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sermons"] }),
  });
}
