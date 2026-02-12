import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Graphic {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  preview_url: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export function useGraphics() {
  const { data: graphics = [], isLoading } = useQuery({
    queryKey: ["graphics"],
    queryFn: () => api.get<Graphic[]>("/api/graphics"),
  });
  return { graphics, isLoading };
}
