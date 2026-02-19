import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Sermon = Tables<"sermons">;

export function useSermons() {
  return useQuery({
    queryKey: ["sermons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sermons")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
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
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useAddSermon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sermon: TablesInsert<"sermons">) => {
      const { data, error } = await supabase
        .from("sermons")
        .insert(sermon)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sermons"] }),
  });
}

export function useUpdateSermon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"sermons"> & { id: string }) => {
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
