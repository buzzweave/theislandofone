import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExperienceMediaItem {
  id: string;
  experience_id: string | null;
  kind: string;
  url: string;
  storage_path: string | null;
  mime: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  tags: string[];
  title: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE = "experience_media";

export function useExperienceMedia(experienceId: string | undefined) {
  return useQuery({
    queryKey: [TABLE, experienceId],
    enabled: !!experienceId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .eq("experience_id", experienceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExperienceMediaItem[];
    },
  });
}

export function useAddMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ExperienceMediaItem> & { experience_id: string; kind: string; url: string }) => {
      const { data, error } = await (supabase as any).from(TABLE).insert(payload).select("*").single();
      if (error) throw error;
      return data as ExperienceMediaItem;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: [TABLE, d.experience_id] }),
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, experience_id }: { id: string; experience_id: string }) => {
      const { error } = await (supabase as any).from(TABLE).delete().eq("id", id);
      if (error) throw error;
      return { id, experience_id };
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: [TABLE, d.experience_id] }),
  });
}

export async function uploadExperienceFile(file: File, experienceId: string): Promise<{ url: string; path: string }> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `experiences/${experienceId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("workspace-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("workspace-media").getPublicUrl(path);
  return { url: data.publicUrl, path };
}
