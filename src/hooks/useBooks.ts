import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type BookChapter = Tables<"book_chapters">;
export type BookChapterInput = Omit<BookChapter, "created_at" | "updated_at">;
export type Book = Tables<"books"> & { chapters: BookChapterInput[] };

export function useBooks() {
  return useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const { data: books, error } = await supabase
        .from("books")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;

      const { data: chapters, error: chErr } = await supabase
        .from("book_chapters")
        .select("*")
        .order("sort_order", { ascending: true });
      if (chErr) throw chErr;

      return (books ?? []).map((b) => ({
        ...b,
        chapters: (chapters ?? []).filter((c) => c.book_id === b.id),
      })) as Book[];
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
        .maybeSingle();
      if (error) throw error;
      if (!book) return null;

      const { data: chapters, error: chErr } = await supabase
        .from("book_chapters")
        .select("*")
        .eq("book_id", id!)
        .order("sort_order", { ascending: true });
      if (chErr) throw chErr;

      return { ...book, chapters: chapters ?? [] } as Book;
    },
    enabled: !!id,
  });
}

export function useAddBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (book: TablesInsert<"books">) => {
      const { data, error } = await supabase
        .from("books")
        .insert(book)
        .select()
        .single();
      if (error) throw error;
      return { ...data, chapters: [] } as Book;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useUpdateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, chapters, created_at, updated_at, ...rest }: Partial<Book> & { id: string }) => {
      const { data, error } = await supabase
        .from("books")
        .update(rest as TablesUpdate<"books">)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
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
    mutationFn: async ({ bookId, chapters }: { bookId: string; chapters: BookChapterInput[] }) => {
      // Delete existing chapters then re-insert
      const { error: delErr } = await supabase
        .from("book_chapters")
        .delete()
        .eq("book_id", bookId);
      if (delErr) throw delErr;

      if (chapters.length > 0) {
        const rows = chapters.map((c) => ({
          ...c,
          book_id: bookId,
        }));
        const { error: insErr } = await supabase
          .from("book_chapters")
          .insert(rows as TablesInsert<"book_chapters">[]);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}
