import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_publish_records")
        .select("*")
        .eq("book_id", bookId!);
      if (error) throw new Error(error.message);
      return (data || []) as unknown as PublishRecord[];
    },
    enabled: !!bookId,
  });
}

export function useUpsertPublishRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { book_id: string; platform: string; status: string; store_url?: string; notes?: string }) => {
      // Check if record exists
      const { data: existing } = await supabase
        .from("book_publish_records")
        .select("id")
        .eq("book_id", data.book_id)
        .eq("platform", data.platform)
        .maybeSingle();

      const payload: any = {
        book_id: data.book_id,
        platform: data.platform,
        status: data.status,
        store_url: data.store_url || null,
        notes: data.notes || null,
        updated_at: new Date().toISOString(),
      };

      if (data.status === "submitted") {
        payload.submitted_at = new Date().toISOString();
      }
      if (data.status === "live") {
        payload.published_at = new Date().toISOString();
      }

      if (existing?.id) {
        const { data: result, error } = await supabase
          .from("book_publish_records")
          .update(payload)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return result as unknown as PublishRecord;
      } else {
        const { data: result, error } = await supabase
          .from("book_publish_records")
          .insert(payload)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return result as unknown as PublishRecord;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["publish_records", vars.book_id] });
    },
  });
}
