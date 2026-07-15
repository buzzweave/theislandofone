import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PrayerRequest {
  id: string;
  experience_id: string | null;
  user_id: string | null;
  anon_id: string | null;
  name: string | null;
  contact: string | null;
  message: string;
  urgency: string | null;
  visibility: string;
  status: string;
  claimed_by: string | null;
  private_notes: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE = "prayer_requests";

export function usePrayerRequests(opts?: { experienceId?: string | null; publicOnly?: boolean }) {
  return useQuery({
    queryKey: [TABLE, opts?.experienceId ?? "all", opts?.publicOnly ?? false],
    queryFn: async () => {
      let q: any = (supabase as any).from(TABLE).select("*").order("created_at", { ascending: false });
      if (opts?.experienceId) q = q.eq("experience_id", opts.experienceId);
      if (opts?.publicOnly) q = q.eq("visibility", "public").in("status", ["new", "praying", "answered"]);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PrayerRequest[];
    },
  });
}

export function useCreatePrayerRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<PrayerRequest> & { message: string }) => {
      const { data: sess } = await supabase.auth.getSession();
      const anon = sess.session?.user ? null : (await import("@/lib/experienceAnalytics")).getAnonId();
      const row: any = {
        user_id: sess.session?.user?.id ?? null,
        anon_id: anon,
        visibility: payload.visibility ?? "private",
        status: "new",
        ...payload,
      };
      const { data, error } = await (supabase as any).from(TABLE).insert(row).select("*").single();
      if (error) throw error;
      // Fire-and-forget notification
      try {
        await (supabase as any).functions.invoke("notify-response", {
          body: { type: "prayer", record: data },
        });
      } catch {}
      return data as PrayerRequest;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [TABLE] }),
  });
}

export function useUpdatePrayerRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<PrayerRequest> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from(TABLE).update(patch).eq("id", id).select("*").single();
      if (error) throw error;
      return data as PrayerRequest;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [TABLE] }),
  });
}
