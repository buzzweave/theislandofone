import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExperienceScene {
  id: string;
  experience_id: string;
  order_index: number;
  scene_type: string;
  title: string | null;
  internal_label: string | null;
  start_ts: number | null;
  end_ts: number | null;
  background_url: string | null;
  background_kind: string | null;
  ambient_audio_url: string | null;
  heading: string | null;
  body: string | null;
  scripture: string | null;
  scripture_ref: string | null;
  quote: string | null;
  animation: string | null;
  transition: string | null;
  overlay_opacity: number | null;
  text_align: string | null;
  cta: any;
  mobile: any;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

const TABLE = "experience_scenes";

export function useScenes(experienceId: string | undefined) {
  return useQuery({
    queryKey: [TABLE, experienceId],
    enabled: !!experienceId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .eq("experience_id", experienceId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ExperienceScene[];
    },
  });
}

export function useCreateScene() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ExperienceScene> & { experience_id: string }) => {
      const { data, error } = await (supabase as any).from(TABLE).insert(payload).select("*").single();
      if (error) throw error;
      return data as ExperienceScene;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: [TABLE, d.experience_id] }),
  });
}

export function useUpdateScene() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ExperienceScene> & { id: string }) => {
      const { data, error } = await (supabase as any).from(TABLE).update(patch).eq("id", id).select("*").single();
      if (error) throw error;
      return data as ExperienceScene;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: [TABLE, d.experience_id] }),
  });
}

export function useDeleteScene() {
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

export function useReorderScenes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ experience_id, order }: { experience_id: string; order: string[] }) => {
      // Update each scene's order_index in parallel
      await Promise.all(
        order.map((id, index) =>
          (supabase as any).from(TABLE).update({ order_index: index }).eq("id", id)
        )
      );
      return { experience_id };
    },
    onMutate: async ({ experience_id, order }) => {
      await qc.cancelQueries({ queryKey: [TABLE, experience_id] });
      const prev = qc.getQueryData<ExperienceScene[]>([TABLE, experience_id]);
      if (prev) {
        const map = new Map(prev.map((s) => [s.id, s]));
        const reordered = order.map((id, i) => ({ ...(map.get(id) as ExperienceScene), order_index: i }));
        qc.setQueryData([TABLE, experience_id], reordered);
      }
      return { prev };
    },
    onError: (_e, v, ctx) => {
      if (ctx?.prev) qc.setQueryData([TABLE, v.experience_id], ctx.prev);
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: [TABLE, v.experience_id] }),
  });
}
