import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExperienceInteraction {
  id: string;
  experience_id: string;
  scene_id: string | null;
  kind: string;
  name: string | null;
  heading: string | null;
  body: string | null;
  appear_ts: number | null;
  expire_ts: number | null;
  duration_ms: number | null;
  required: boolean;
  button_label: string | null;
  destination: string | null;
  confirmation: string | null;
  follow_up: any;
  audience: string | null;
  mobile: any;
  anonymous_allowed: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

const TABLE = "experience_interactions";

export function useInteractions(experienceId: string | undefined) {
  return useQuery({
    queryKey: [TABLE, experienceId],
    enabled: !!experienceId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .eq("experience_id", experienceId)
        .order("appear_ts", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as ExperienceInteraction[];
    },
  });
}

export function useCreateInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ExperienceInteraction> & { experience_id: string; kind: string }) => {
      const { data, error } = await (supabase as any).from(TABLE).insert(payload).select("*").single();
      if (error) throw error;
      return data as ExperienceInteraction;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: [TABLE, d.experience_id] }),
  });
}

export function useUpdateInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ExperienceInteraction> & { id: string }) => {
      const { data, error } = await (supabase as any).from(TABLE).update(patch).eq("id", id).select("*").single();
      if (error) throw error;
      return data as ExperienceInteraction;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: [TABLE, d.experience_id] }),
  });
}

export function useDeleteInteraction() {
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
