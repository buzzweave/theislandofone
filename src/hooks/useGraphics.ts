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

function normalize(raw: any[]): Graphic[] {
  return raw.map((g: any) => ({
    ...g,
    price: Number(g.price) || 0,
    is_active: g.is_active === 1 || g.is_active === true,
    access_tiers: Array.isArray(g.access_tiers)
      ? g.access_tiers
      : typeof g.access_tiers === "string"
      ? JSON.parse(g.access_tiers || "[]")
      : [],
  }));
}

/** Public hook – returns active graphics only */
export function useGraphics() {
  const { data: graphics = [], isLoading } = useQuery({
    queryKey: ["graphics"],
    queryFn: async () => {
      const raw = await api.get<any[]>("/api/graphics");
      return normalize(raw).filter((g) => g.is_active);
    },
  });
  return { graphics, isLoading };
}

/** Admin hook – returns all graphics */
export function useAdminGraphics() {
  const { data: graphics = [], isLoading, refetch } = useQuery({
    queryKey: ["graphics", "admin"],
    queryFn: async () => {
      const raw = await api.get<any[]>("/api/graphics");
      return normalize(raw);
    },
  });
  return { graphics, isLoading, refetch };
}
