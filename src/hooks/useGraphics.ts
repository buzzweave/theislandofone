import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

/** Public hook – returns active graphics only with aggressive caching */
export function useGraphics() {
  const { data: graphics = [], isLoading } = useQuery({
    queryKey: ["graphics"],
    staleTime: 10 * 60 * 1000, // 10 min cache
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("graphics")
        .select("id,title,description,category,price,preview_url,file_url,access_tiers,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return data as Graphic[];
    },
  });
  return { graphics, isLoading };
}

/** Admin hook – returns all graphics */
export function useAdminGraphics() {
  const { data: graphics = [], isLoading, refetch } = useQuery({
    queryKey: ["graphics", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("graphics")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return data as Graphic[];
    },
  });
  return { graphics, isLoading, refetch };
}
