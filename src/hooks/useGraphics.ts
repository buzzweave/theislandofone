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

/** Public hook – returns active graphics only */
export function useGraphics() {
  const { data: graphics = [], isLoading } = useQuery({
    queryKey: ["graphics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("graphics")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Graphic[];
    },
  });
  return { graphics, isLoading };
}

/** Admin hook – returns ALL graphics (including inactive/draft) via admin RLS */
export function useAdminGraphics() {
  const { data: graphics = [], isLoading, refetch } = useQuery({
    queryKey: ["graphics", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("graphics")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Graphic[];
    },
  });
  return { graphics, isLoading, refetch };
}
