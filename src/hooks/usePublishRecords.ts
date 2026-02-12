import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface PublishRecord {
  id: string;
  book_id: string;
  platform: "apple_books" | "amazon_kdp";
  status: "draft" | "formatting" | "ready" | "submitted" | "live" | "rejected";
  store_url: string;
  submitted_at: string | null;
  published_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export function usePublishRecords(bookId?: string) {
  return useQuery({
    queryKey: ["publish_records", bookId],
    queryFn: () => api.get<PublishRecord[]>(`/api/books/${bookId}/publish-records`),
    enabled: !!bookId,
  });
}

export function useUpsertPublishRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { book_id: string; platform: string; status: string; store_url?: string; notes?: string }) =>
      api.post<PublishRecord>("/api/publish-records", data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["publish_records", vars.book_id] });
    },
  });
}
