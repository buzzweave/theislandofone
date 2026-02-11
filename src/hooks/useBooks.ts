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

async function ensureAdminSession() {
  // Just check if we have a session — don't call refreshSession() as it hangs.
  // The AdminAuthContext already refreshes the token every 4 minutes.
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session;
  throw new Error("Your session has expired. Please log in again from the admin login page.");
}

export function useUpdateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, chapters, created_at, updated_at, ...rest }: Partial<Book> & { id: string }) => {
      await ensureAdminSession();
      const updates: Record<string, unknown> = {};
      const validCols = ["title","subtitle","author","description","price","is_free","category","cover_image","featured","audio_url","pdf_url","sort_order"];
      for (const key of validCols) {
        if (key in rest) updates[key] = (rest as Record<string, unknown>)[key];
      }
      const { data, error } = await supabase
        .from("books")
        .update(updates)
        .eq("id", id)
        .select();
      if (error) {
        console.error("Book update error:", error);
        throw new Error(`Save failed: ${error.message}`);
      }
      if (!data || data.length === 0) throw new Error("Save failed – RLS blocked the update. Please log in again as admin.");
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
      await ensureAdminSession();

      if (chapters.length > 0) {
        const CHUNK_SIZE = 2;
        const MAX_RETRIES = 3;
        const rows = chapters.map((ch, i) => ({
          id: ch.id,
          book_id: bookId,
          title: ch.title,
          content: ch.content,
          sort_order: i,
        }));
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
          const chunk = rows.slice(i, i + CHUNK_SIZE);
          let lastError: Error | null = null;
          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            const { error } = await supabase.from("book_chapters").upsert(chunk, { onConflict: "id" });
            if (!error) { lastError = null; break; }
            lastError = new Error(error.message);
            console.warn(`Chapter upsert attempt ${attempt + 1} failed:`, error.message);
            if (attempt < MAX_RETRIES - 1) {
              await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            }
          }
          if (lastError) throw new Error(`Failed to save chapters: ${lastError.message}`);
          // Small delay between chunks
          if (i + CHUNK_SIZE < rows.length) {
            await new Promise((r) => setTimeout(r, 300));
          }
        }
      }

      // Remove chapters that were deleted by the user
      const keepIds = chapters.map((ch) => ch.id);
      const { data: existing } = await supabase
        .from("book_chapters")
        .select("id")
        .eq("book_id", bookId);
      const toDelete = (existing ?? []).filter((ch) => !keepIds.includes(ch.id)).map((ch) => ch.id);
      if (toDelete.length > 0) {
        const { error: delError } = await supabase.from("book_chapters").delete().in("id", toDelete);
        if (delError) {
          console.error("Chapter delete error:", delError);
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}
