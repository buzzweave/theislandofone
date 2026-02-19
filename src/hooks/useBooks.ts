import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

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
  access_tiers: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
  chapters: BookChapter[];
}

export function useBooks() {
  return useQuery({
    queryKey: ["books"],
    queryFn: () => api.get<Book[]>("/api/books"),
  });
}

export function useBook(id: string | undefined) {
  return useQuery({
    queryKey: ["books", id],
    queryFn: () => api.get<Book | null>(`/api/books/${id}`),
    enabled: !!id,
  });
}

export function useAddBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (book: Omit<Book, "id" | "created_at" | "updated_at" | "chapters">) =>
      api.post<Book>("/api/books", book),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useUpdateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, chapters, created_at, updated_at, ...rest }: Partial<Book> & { id: string }) =>
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

export function useUpsertChapters() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, chapters }: { bookId: string; chapters: Omit<BookChapter, "book_id">[] }) =>
      api.put(`/api/books/${bookId}/chapters`, { chapters }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}
