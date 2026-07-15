import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ImmersiveExperience {
  id: string;
  series_id: string | null;
  title: string;
  slug: string;
  short_description: string | null;
  long_description: string | null;
  primary_scripture: string | null;
  supporting_scriptures: any;
  speaker: string | null;
  release_date: string | null;
  premiere_at: string | null;
  runtime_seconds: number | null;
  category: string | null;
  audience: string | null;
  featured_image: string | null;
  mobile_image: string | null;
  cinematic_bg: string | null;
  poster_url: string | null;
  trailer_url: string | null;
  video_provider: string | null;
  video_playback_id: string | null;
  video_url: string | null;
  captions_url: string | null;
  transcript: string | null;
  ambient_audio_url: string | null;
  theme: any;
  social_image: string | null;
  visibility: string;
  status: string;
  members_only: boolean;
  allow_download: boolean;
  view_count: number;
  order_index: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useExperiences() {
  return useQuery({
    queryKey: ["immersive_experiences"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("immersive_experiences")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ImmersiveExperience[];
    },
  });
}

export function useExperience(id: string | undefined) {
  return useQuery({
    queryKey: ["immersive_experiences", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("immersive_experiences")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as ImmersiveExperience | null;
    },
  });
}

export function useExperienceBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["immersive_experiences", "slug", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("immersive_experiences")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as ImmersiveExperience | null;
    },
  });
}

export function useCreateExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ImmersiveExperience>) => {
      const { data, error } = await (supabase as any)
        .from("immersive_experiences")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data as ImmersiveExperience;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["immersive_experiences"] }),
  });
}

export function useUpdateExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ImmersiveExperience> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("immersive_experiences")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as ImmersiveExperience;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["immersive_experiences"] });
      qc.invalidateQueries({ queryKey: ["immersive_experiences", v.id] });
    },
  });
}

export function useDeleteExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("immersive_experiences")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["immersive_experiences"] }),
  });
}

export function useDuplicateExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: src, error: e1 } = await (supabase as any)
        .from("immersive_experiences")
        .select("*")
        .eq("id", id)
        .single();
      if (e1) throw e1;
      const { id: _omit, created_at, updated_at, published_at, view_count, ...rest } = src;
      const copy = {
        ...rest,
        title: `${src.title} (Copy)`,
        slug: `${src.slug}-copy-${Date.now().toString(36)}`,
        status: "draft",
        published_at: null,
        view_count: 0,
      };
      const { data, error } = await (supabase as any)
        .from("immersive_experiences")
        .insert(copy)
        .select("*")
        .single();
      if (error) throw error;
      return data as ImmersiveExperience;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["immersive_experiences"] }),
  });
}
