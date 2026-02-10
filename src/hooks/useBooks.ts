import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BookChapter {
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
  is_free: boolean;
  category: string;
  cover_image: string;
  featured: boolean;
  audio_url: string | null;
  pdf_url: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  chapters: BookChapter[];
}

export function useBooks() {
  return useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const [booksRes, chaptersRes] = await Promise.all([
        supabase.from("books").select("*").order("sort_order", { ascending: true }),
        supabase.from("book_chapters").select("*").order("sort_order", { ascending: true }),
      ]);
      if (booksRes.error) throw booksRes.error;
      if (chaptersRes.error) throw chaptersRes.error;

      const chaptersByBook = new Map<string, BookChapter[]>();
      for (const ch of chaptersRes.data ?? []) {
        const arr = chaptersByBook.get(ch.book_id) ?? [];
        arr.push(ch);
        chaptersByBook.set(ch.book_id, arr);
      }

      return (booksRes.data ?? []).map((b) => ({
        ...b,
        chapters: chaptersByBook.get(b.id) ?? [],
      })) as Book[];
    },
    staleTime: 30000,
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
        .maybeSingle();
      if (error) throw error;
      if (!book) return null;

      const { data: chapters, error: chError } = await supabase
        .from("book_chapters")
        .select("*")
        .eq("book_id", id!)
        .order("sort_order", { ascending: true });
      if (chError) throw chError;

      return { ...book, chapters: chapters ?? [] } as Book;
    },
    enabled: !!id,
  });
}

export function useAddBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (book: Omit<Book, "id" | "created_at" | "updated_at" | "chapters">) => {
      const { data, error } = await supabase.from("books").insert(book).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useUpdateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, chapters, ...updates }: Partial<Book> & { id: string }) => {
      const { data, error } = await supabase
        .from("books")
        .update(updates)
        .eq("id", id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Save failed – are you logged in as admin?");
      return data[0];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useUpsertChapters() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookId, chapters }: { bookId: string; chapters: Omit<BookChapter, "book_id">[] }) => {
      // Delete existing chapters
      await supabase.from("book_chapters").delete().eq("book_id", bookId);
      // Insert new ones
      if (chapters.length > 0) {
        const rows = chapters.map((ch, i) => ({
          id: ch.id,
          book_id: bookId,
          title: ch.title,
          content: ch.content,
          sort_order: i,
        }));
        const { error } = await supabase.from("book_chapters").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}
