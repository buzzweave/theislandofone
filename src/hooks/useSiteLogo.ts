import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSiteLogo() {
  const queryClient = useQueryClient();

  const { data: logoUrl, isLoading } = useQuery({
    queryKey: ["site-logo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "logo_url")
        .maybeSingle();
      if (error) throw error;
      return data?.value || "";
    },
  });

  const updateLogo = async (url: string) => {
    const { error } = await supabase
      .from("site_settings")
      .update({ value: url, updated_at: new Date().toISOString() })
      .eq("key", "logo_url");
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["site-logo"] });
  };

  return { logoUrl: logoUrl || "", isLoading, updateLogo };
}
