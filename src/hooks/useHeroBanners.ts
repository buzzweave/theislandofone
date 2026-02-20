import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return data as HeroBanner[];
    },
  });
  return { banners, ...rest };
}

/** Admin hook – returns all banners regardless of active status */
export function useAdminHeroBanners() {
  const { data: banners = [], ...rest } = useQuery({
    queryKey: ["hero-banners", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_banners")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return data as HeroBanner[];
    },
  });
  return { banners, ...rest };
}
