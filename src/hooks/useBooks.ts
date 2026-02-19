import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    queryFn: () => api.get<Book[]>("/api/books"),
  });
}

export function useBook(id: string | undefined) {
  return useQuery({
    queryKey: ["books", id],
    queryFn: () => api.get<Book>(`/api/books/${id}`),
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
