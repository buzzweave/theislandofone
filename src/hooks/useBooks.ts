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
      // Try VPS first (source of truth for books with chapters)
      try {
        const vpsBooks = await api.get<Book[]>("/api/books");
        if (Array.isArray(vpsBooks) && vpsBooks.length > 0) return vpsBooks;
      } catch (e) {
        console.warn("VPS books fetch failed, falling back to database:", e);
      }
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
      try {
        const vpsBook = await api.get<Book>(`/api/books/${id}`);
        if (vpsBook && vpsBook.id) {
          if (!vpsBook.chapters) vpsBook.chapters = [];
          return vpsBook;
        }
      } catch (e) {
        console.warn("VPS book fetch failed, falling back to database:", e);
      }
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
      // Try VPS first for books (manages chapters)
      try {
        return await api.post<Book>("/api/books", {
          ...book,
          is_free: book.is_free ? 1 : 0,
          featured: book.featured ? 1 : 0,
        });
      } catch (e) {
        console.warn("VPS add book failed, using database:", e);
      }
      // Fallback to Supabase
      const payload: any = { ...book };
      payload.is_free = !!payload.is_free;
      payload.featured = !!payload.featured;
      delete payload.chapters;
      delete payload.access_tiers;
      
      const { data, error } = await supabase
        .from("books")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { ...data, chapters: [] } as Book;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useUpdateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: Partial<Book> & { id: string }) => {
      // Try VPS first
      try {
        const { access_tiers, chapters, sort_order, ...bookData } = rest as any;
        return await api.put<Book>(`/api/books/${id}`, {
          ...bookData,
          is_free: rest.is_free ? 1 : 0,
          featured: rest.featured ? 1 : 0,
        });
      } catch (e) {
        console.warn("VPS update book failed, using database:", e);
      }
      // Fallback to Supabase
      const payload: any = { ...rest };
      if ("is_free" in payload) payload.is_free = !!payload.is_free;
      if ("featured" in payload) payload.featured = !!payload.featured;
      delete payload.chapters;
      delete payload.access_tiers;
      delete payload.sort_order;
      
      const { data, error } = await supabase
        .from("books")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Book;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.delete(`/api/books/${id}`);
        return;
      } catch (e) {
        console.warn("VPS delete book failed, using database:", e);
      }
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}
