import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExperienceEvent {
  id: string;
  experience_id: string;
  user_id: string | null;
  anon_id: string | null;
  kind: string;
  ts: string;
  payload: any;
}

export function useExperienceAnalytics(experienceId: string | undefined) {
  return useQuery({
    queryKey: ["experience_analytics", experienceId],
    enabled: !!experienceId,
    queryFn: async () => {
      const [eventsRes, progressRes, responsesRes] = await Promise.all([
        (supabase as any).from("experience_events").select("*")
          .eq("experience_id", experienceId).order("ts", { ascending: false }).limit(500),
        (supabase as any).from("experience_view_progress").select("*")
          .eq("experience_id", experienceId).order("last_seen_at", { ascending: false }).limit(500),
        (supabase as any).from("experience_responses").select("*")
          .eq("experience_id", experienceId).order("created_at", { ascending: false }).limit(200),
      ]);
      const events = (eventsRes.data ?? []) as ExperienceEvent[];
      const progress = (progressRes.data ?? []) as any[];
      const responses = (responsesRes.data ?? []) as any[];

      const uniqueViewers = new Set(
        events.filter((e) => e.kind === "view_start").map((e) => e.user_id ?? e.anon_id)
      ).size;
      const views = events.filter((e) => e.kind === "view_start").length;
      const completes = events.filter((e) => e.kind === "complete").length;
      const completionRate = views > 0 ? completes / views : 0;
      const avgWatchSeconds = progress.length > 0
        ? progress.reduce((a, p) => a + Number(p.position_seconds ?? 0), 0) / progress.length
        : 0;
      const interactionClicks = events.filter((e) => e.kind === "interaction_click").length;

      return { events, progress, responses, uniqueViewers, views, completes, completionRate, avgWatchSeconds, interactionClicks };
    },
  });
}
