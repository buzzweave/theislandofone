import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";

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
      return data as Book[];
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
      // Also fetch chapters
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
    mutationFn: (book: Partial<Book>) => api.post<Book>("/api/books", book),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useUpdateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...rest }: Partial<Book> & { id: string }) =>
      api.put<Book>(`/api/books/${id}`, rest),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/books/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}
