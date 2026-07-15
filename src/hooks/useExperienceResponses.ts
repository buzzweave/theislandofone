import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExperienceResponse {
  id: string;
  experience_id: string;
  interaction_id: string | null;
  user_id: string | null;
  anon_id: string | null;
  kind: string;
  payload: any;
  is_private: boolean;
  created_at: string;
}

export function useExperienceResponses(experienceId: string | undefined) {
  return useQuery({
    queryKey: ["experience_responses", experienceId],
    enabled: !!experienceId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("experience_responses")
        .select("*")
        .eq("experience_id", experienceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExperienceResponse[];
    },
  });
}
