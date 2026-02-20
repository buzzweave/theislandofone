import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BookChapterInput {
  id: string;
  book_id: string;
  title: string;
  content: string;
  sort_order: number;
}

export interface Book {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  description: string;
  price: number;
  is_free: number | boolean;
  category: string;
  cover_image: string;
  featured: number | boolean;
  audio_url: string | null;
  pdf_url: string;
  sort_order: number;
  access_tiers: string[] | string;
  chapters: BookChapterInput[];
  created_at: string;
  updated_at: string;
}

export function useBooks() {
  return useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data || []).map((b: any) => ({ ...b, chapters: [] })) as Book[];
    },
  });
}

export function useBook(id: string | undefined) {
  return useQuery({
    queryKey: ["books", id],
    queryFn: async () => {
      const { data: book, error } = await supabase
        .from("books")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw new Error(error.message);
      const { data: chapters } = await supabase
        .from("book_chapters")
        .select("*")
        .eq("book_id", id!)
        .order("sort_order", { ascending: true });
      return { ...book, chapters: chapters || [] } as Book;
    },
    enabled: !!id,
  });
}

export function useAddBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (book: Partial<Book>) => {
      const payload: any = { ...book };
      payload.is_free = !!payload.is_free;
      payload.featured = !!payload.featured;
      if (!payload.audio_url) payload.audio_url = null;
      if (!payload.access_tiers) payload.access_tiers = [];
      if (typeof payload.access_tiers === "string") {
        payload.access_tiers = payload.access_tiers.split(",").filter(Boolean);
      }
      delete payload.chapters;

      const { data, error } = await supabase
        .from("books")
        .insert(payload)
        .select()
        .single();
      if (error) {
        console.error("Book insert error:", error);
        throw new Error(error.message);
      }
      return { ...data, chapters: [] } as Book;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useUpdateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: Partial<Book> & { id: string }) => {
      const payload: any = { ...rest };
      if ("is_free" in payload) payload.is_free = !!payload.is_free;
      if ("featured" in payload) payload.featured = !!payload.featured;
      if ("audio_url" in payload && !payload.audio_url) payload.audio_url = null;
      if ("access_tiers" in payload && typeof payload.access_tiers === "string") {
        payload.access_tiers = payload.access_tiers.split(",").filter(Boolean);
      }
      delete payload.chapters;

      const { data, error } = await supabase
        .from("books")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        console.error("Book update error:", error);
        throw new Error(error.message);
      }
      return data as Book;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}
