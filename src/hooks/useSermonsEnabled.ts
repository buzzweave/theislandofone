import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight hook that checks if the Sermons section is enabled.
 * Cached aggressively so it doesn't re-fetch on every page.
 */
export function useSermonsEnabled() {
  const { data: enabled = true, isLoading } = useQuery({
    queryKey: ["site-setting", "sermons_enabled"],
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "sermons_enabled")
        .maybeSingle();
      if (error) return true; // default on
      return data?.value !== "false";
    },
  });
  return { enabled, isLoading };
}
