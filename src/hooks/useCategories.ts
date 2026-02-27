import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContentCategory {
  id: string;
  type: "book" | "sermon";
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useCategories(type: "book" | "sermon") {
  return useQuery({
    queryKey: ["content_categories", type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_categories")
        .select("*")
        .eq("type", type)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return data as ContentCategory[];
    },
  });
}

export function useAddCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat: { type: string; name: string; slug: string; description?: string }) => {
      const { data, error } = await supabase
        .from("content_categories")
        .insert(cat)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as ContentCategory;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content_categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContentCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from("content_categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as ContentCategory;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content_categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_categories").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content_categories"] }),
  });
}
