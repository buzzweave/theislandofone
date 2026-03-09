import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useSiteLogo() {
  const queryClient = useQueryClient();

  const { data: logoUrl, isLoading } = useQuery({
    queryKey: ["site-logo"],
    queryFn: async () => {
      try {
        const data = await api.get<{ value: string }>("/api/site-settings/logo_url");
        return data?.value || "";
      } catch {
        return "";
      }
    },
  });

  const updateLogo = async (url: string) => {
    await api.put("/api/site-settings/logo_url", { value: url });
    queryClient.invalidateQueries({ queryKey: ["site-logo"] });
  };

  return { logoUrl: logoUrl || "", isLoading, updateLogo };
}
