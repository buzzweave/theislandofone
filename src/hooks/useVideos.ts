import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Video = Tables<"videos">;

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

export function useAddVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (video: TablesInsert<"videos">) => {
      const { data, error } = await supabase
        .from("videos")
        .insert(video)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useUpdateVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"videos"> & { id: string }) => {
      const { data, error } = await supabase
        .from("videos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useDeleteVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("videos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}
