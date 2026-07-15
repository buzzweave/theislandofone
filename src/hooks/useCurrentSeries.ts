import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ImmersiveExperience } from "./useExperiences";
import type { ExperienceSeries } from "./useExperienceSeries";

export type CurrentSeriesRow = ExperienceSeries & {
  is_current_series: boolean;
  is_featured: boolean;
  featured_experience_id: string | null;
  homepage_visible: boolean;
  show_on_watch: boolean;
  homepage_headline: string | null;
  homepage_description: string | null;
  homepage_artwork_url: string | null;
  homepage_mobile_artwork_url: string | null;
  homepage_preview_video_url: string | null;
  primary_watch_label: string | null;
  secondary_watch_label: string | null;
  display_start_at: string | null;
  display_end_at: string | null;
  featured_priority: number;
  featured_experience?: ImmersiveExperience | null;
};

/** The single "primary current series" flagged in admin, when in-window. */
export function useCurrentSeries(opts?: { requireHomepage?: boolean }) {
  return useQuery({
    queryKey: ["current_series", { home: !!opts?.requireHomepage }],
    staleTime: 60_000,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      let q = (supabase as any)
        .from("experience_series")
        .select("*, featured_experience:immersive_experiences!experience_series_featured_experience_id_fkey(*)")
        .eq("is_current_series", true)
        .eq("status", "published");
      if (opts?.requireHomepage) q = q.eq("homepage_visible", true);
      const { data, error } = await q.maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      const row = data as CurrentSeriesRow | null;
      if (!row) return null;
      // Window filter (client-side to keep policies simple)
      const start = row.display_start_at ? new Date(row.display_start_at) : null;
      const end = row.display_end_at ? new Date(row.display_end_at) : null;
      const now = new Date(nowIso);
      if (start && now < start) return null;
      if (end && now > end) return null;
      return row;
    },
  });
}

export function useFeaturedSeriesList() {
  return useQuery({
    queryKey: ["featured_series_list"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("experience_series")
        .select("*")
        .eq("status", "published")
        .eq("is_featured", true)
        .order("featured_priority", { ascending: false })
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CurrentSeriesRow[];
    },
  });
}
