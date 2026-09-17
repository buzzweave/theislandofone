import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";

export interface Sermon {
  id: string;
  title: string;
  scripture: string;
  date: string;
  category: string;
  excerpt: string;
  manuscript: string;
  audio_url: string | null;
  featured: number | boolean;
  is_free: number | boolean;
  is_published: boolean;
  price: number;
  sort_order: number;
  access_level: string;
  access_tiers: string[] | string;
  preview_cutoff: number;
  created_at: string;
  updated_at: string;
}

/** Build a readable error instead of swallowing Postgres/RLS details. */
function describeError(error: PostgrestError, action: string): Error {
  const parts = [error.message];
  if (error.details) parts.push(error.details);
  if (error.hint) parts.push(error.hint);
  let msg = parts.filter(Boolean).join(" — ");
  if (error.code === "42501" || /row-level security/i.test(error.message)) {
    msg = `Permission denied (${action}). Your admin session is not signed in to the database — sign out and sign in again.`;
  }
  const e = new Error(msg);
  (e as any).code = error.code;
  return e;
}

/** Fail fast (instead of hitting an RLS error) when there is no database session. */
async function requireDbSession(action: string) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw new Error(
      `Cannot ${action}: you are not signed in to the database. Sign out of admin and sign in again.`,
    );
  }
}

function normalizePayload(input: Partial<Sermon>) {
  const payload: Record<string, any> = { ...input };
  if ("featured" in payload) payload.featured = payload.featured === 1 || payload.featured === true;
  if ("is_free" in payload) payload.is_free = payload.is_free === 1 || payload.is_free === true;
  if ("is_published" in payload) payload.is_published = !!payload.is_published;
  if ("price" in payload) payload.price = Number(payload.price) || 0;
  if ("preview_cutoff" in payload) payload.preview_cutoff = Number(payload.preview_cutoff) || 0;
  if ("audio_url" in payload && !payload.audio_url) payload.audio_url = null;
  if ("access_tiers" in payload) {
    const t = payload.access_tiers;
    payload.access_tiers = Array.isArray(t)
      ? t.filter(Boolean)
      : typeof t === "string"
        ? t.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];
  }
  return payload;
}

/** Admin list: every sermon, drafts included. */
export function useSermons() {
  return useQuery({
    queryKey: ["sermons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sermons")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("date", { ascending: false });
      if (error) throw describeError(error, "load sermons");
      return (data ?? []) as Sermon[];
    },
  });
}

/** Public list: published sermons only, newest first. */
export function usePublishedSermons() {
  return useQuery({
    queryKey: ["sermons", "published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sermons")
        .select("*")
        .eq("is_published", true)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw describeError(error, "load sermons");
      return (data ?? []) as Sermon[];
    },
  });
}

export function useSermon(id: string | undefined) {
  return useQuery({
    queryKey: ["sermons", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sermons")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw describeError(error, "load this sermon");
      return (data as Sermon) ?? null;
    },
    enabled: !!id,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["sermons"] });
}

export function useAddSermon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sermon: Partial<Sermon>) => {
      await requireDbSession("create a sermon");
      const payload = normalizePayload({ access_tiers: [], ...sermon });
      const { data, error } = await supabase.from("sermons").insert(payload).select().single();
      if (error) {
        console.error("Sermon insert error:", error);
        throw describeError(error, "create sermon");
      }
      return data as Sermon;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateSermon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Sermon> & { id: string }) => {
      await requireDbSession("save this sermon");
      const payload = normalizePayload(updates);
      const { data, error } = await supabase
        .from("sermons")
        .update(payload)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) {
        console.error("Sermon update error:", error);
        throw describeError(error, "save sermon");
      }
      if (!data) {
        throw new Error(
          "Nothing was saved — the database rejected the change (the sermon is missing or your session lacks admin permission).",
        );
      }
      return data as Sermon;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteSermon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await requireDbSession("delete this sermon");
      const { data, error } = await supabase.from("sermons").delete().eq("id", id).select("id");
      if (error) throw describeError(error, "delete sermon");
      if (!data || data.length === 0) {
        throw new Error("Nothing was deleted — the database rejected the change.");
      }
    },
    onSuccess: () => invalidate(qc),
  });
}
