import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SavedExperienceRow = {
  id: string;
  experience_id: string;
  created_at: string;
  experience?: {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    cover_image: string | null;
    status: string;
  } | null;
};

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export function useSavedExperiences() {
  return useQuery({
    queryKey: ["saved-experiences"],
    queryFn: async () => {
      const uid = await getUserId();
      if (!uid) return [] as SavedExperienceRow[];
      const { data, error } = await supabase
        .from("saved_experiences")
        .select(
          "id, experience_id, created_at, experience:immersive_experiences(id, slug, title, subtitle, cover_image, status)"
        )
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SavedExperienceRow[];
    },
  });
}

export function useIsSaved(experienceId?: string) {
  return useQuery({
    queryKey: ["saved-experience", experienceId],
    enabled: !!experienceId,
    queryFn: async () => {
      const uid = await getUserId();
      if (!uid || !experienceId) return false;
      const { data, error } = await supabase
        .from("saved_experiences")
        .select("id")
        .eq("user_id", uid)
        .eq("experience_id", experienceId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export function useToggleSavedExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ experienceId, saved }: { experienceId: string; saved: boolean }) => {
      const uid = await getUserId();
      if (!uid) throw new Error("Sign in to save experiences");
      if (saved) {
        const { error } = await supabase
          .from("saved_experiences")
          .delete()
          .eq("user_id", uid)
          .eq("experience_id", experienceId);
        if (error) throw error;
        return false;
      }
      const { error } = await supabase
        .from("saved_experiences")
        .insert({ user_id: uid, experience_id: experienceId });
      if (error) throw error;
      return true;
    },
    onSuccess: (nowSaved, vars) => {
      qc.invalidateQueries({ queryKey: ["saved-experience", vars.experienceId] });
      qc.invalidateQueries({ queryKey: ["saved-experiences"] });
      toast.success(nowSaved ? "Saved to your library" : "Removed from library");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMyProgress() {
  return useQuery({
    queryKey: ["my-experience-progress"],
    queryFn: async () => {
      const uid = await getUserId();
      if (!uid) return [];
      const { data, error } = await supabase
        .from("experience_view_progress")
        .select(
          "id, experience_id, position_seconds, completed, last_seen_at, experience:immersive_experiences(id, slug, title, subtitle, cover_image, status)"
        )
        .eq("user_id", uid)
        .order("last_seen_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}
