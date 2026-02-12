import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useSiteSettings(key: string, defaultValue = "") {
  const queryClient = useQueryClient();

  const { data: value, isLoading } = useQuery({
    queryKey: ["site-setting", key],
    queryFn: async () => {
      try {
        const data = await api.get<{ value: string }>(`/api/site-settings/${key}`);
        return data?.value || defaultValue;
      } catch {
        return defaultValue;
      }
    },
  });

  const updateValue = async (newValue: string) => {
    await api.put(`/api/site-settings/${key}`, { value: newValue });
    queryClient.invalidateQueries({ queryKey: ["site-setting", key] });
  };

  return { value: value ?? defaultValue, isLoading, updateValue };
}
