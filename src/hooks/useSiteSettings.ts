import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSiteSettings(key: string, defaultValue = "") {
  const queryClient = useQueryClient();

  const { data: value, isLoading } = useQuery({
    queryKey: ["site-setting", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return data?.value || defaultValue;
    },
  });

  const updateValue = async (newValue: string) => {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key, value: newValue, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["site-setting", key] });
  };

  return { value: value ?? defaultValue, isLoading, updateValue };
}
