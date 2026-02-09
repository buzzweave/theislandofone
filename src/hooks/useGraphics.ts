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
  sort_order: number;
  created_at: string;
}

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
