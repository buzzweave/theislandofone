import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Audiobook {
  id: string;
  content_type: "book" | "sermon";
  content_id: string;
  audio_url: string;
  voice_provider: "elevenlabs" | "openai";
  voice_id: string;
  price: number;
  is_separate_price: boolean;
  is_visible: boolean;
  is_featured: boolean;
  is_free: boolean;
  cover_image: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function useAudiobooks() {
  return useQuery({
    queryKey: ["audiobooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audiobooks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Audiobook[];
    },
  });
}

export function useUpsertAudiobook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (audiobook: Omit<Audiobook, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("audiobooks")
        .upsert(audiobook, { onConflict: "content_type,content_id" })
        .select()
        .single();
      if (error) throw error;
      return data as Audiobook;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audiobooks"] }),
  });
}

export function useUpdateAudiobook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Audiobook> & { id: string }) => {
      const { data, error } = await supabase
        .from("audiobooks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Audiobook;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audiobooks"] }),
  });
}

export function useDeleteAudiobook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("audiobooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audiobooks"] }),
  });
}
