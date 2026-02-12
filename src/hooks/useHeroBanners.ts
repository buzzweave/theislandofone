import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  cta_text: string | null;
  cta_link: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useHeroBanners() {
  const { data: banners = [], ...rest } = useQuery({
    queryKey: ["hero-banners"],
    queryFn: () => api.get<HeroBanner[]>("/api/hero-banners"),
  });
  return { banners, ...rest };
}
