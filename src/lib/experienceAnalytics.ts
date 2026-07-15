import { supabase } from "@/integrations/supabase/client";

const ANON_KEY = "io1_anon_id";

export function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export async function logExperienceEvent(params: {
  experienceId: string;
  kind: string;
  payload?: Record<string, any>;
}) {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user?.id ?? null;
    await (supabase as any).from("experience_events").insert({
      experience_id: params.experienceId,
      user_id: userId,
      anon_id: userId ? null : getAnonId(),
      kind: params.kind,
      payload: params.payload ?? {},
    });
  } catch {
    // best-effort
  }
}

export async function upsertViewProgress(params: {
  experienceId: string;
  positionSeconds: number;
  completed?: boolean;
}) {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user?.id ?? null;
    const row: any = {
      experience_id: params.experienceId,
      position_seconds: params.positionSeconds,
      last_seen_at: new Date().toISOString(),
    };
    if (params.completed) row.completed = true;
    if (userId) row.user_id = userId;
    else row.anon_id = getAnonId();

    const q = (supabase as any).from("experience_view_progress").select("id").eq("experience_id", params.experienceId);
    const existing = userId ? await q.eq("user_id", userId).maybeSingle() : await q.eq("anon_id", getAnonId()).is("user_id", null).maybeSingle();

    if (existing?.data?.id) {
      await (supabase as any).from("experience_view_progress").update(row).eq("id", existing.data.id);
    } else {
      await (supabase as any).from("experience_view_progress").insert(row);
    }
  } catch {
    // best-effort
  }
}
