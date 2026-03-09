import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSiteLogo() {
  const queryClient = useQueryClient();

  const { data: logoUrl, isLoading } = useQuery({
    queryKey: ["site-logo"],
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "logo_url")
          .maybeSingle();
        if (error) throw error;
        return data?.value || "";
      } catch {
        return "";
      }
    },
  });

  const updateLogo = async (url: string) => {
    await supabase
      .from("site_settings")
      .upsert({ key: "logo_url", value: url, updated_at: new Date().toISOString() }, { onConflict: "key" });
    queryClient.invalidateQueries({ queryKey: ["site-logo"] });
  };

  return { logoUrl: logoUrl || "", isLoading, updateLogo };
}
