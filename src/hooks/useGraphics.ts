import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Graphic {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  preview_url: string;
  file_url: string;
  is_active: boolean;
  access_tiers: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Public hook – VPS returns active graphics */
export function useGraphics() {
  const { data: graphics = [], isLoading } = useQuery({
    queryKey: ["graphics"],
    queryFn: () => api.get<Graphic[]>("/api/graphics"),
  });
  return { graphics, isLoading };
}
