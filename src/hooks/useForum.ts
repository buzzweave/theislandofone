import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ForumCategory {
  id: string;
  name: string;
  description: string;
  slug: string;
  tier_required: string;
  sort_order: number;
  created_at: string;
  post_count?: number;
  latest_post?: { title: string; created_at: string; author_name: string } | null;
}

export interface ForumPost {
  id: string;
  category_id: string;
  user_id: string;
  author_name: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  reply_count?: number;
}

export interface ForumReply {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function useForumCategories() {
  return useQuery({
    queryKey: ["forum-categories"],
    queryFn: async (): Promise<ForumCategory[]> => {
      const { data: categories, error } = await supabase
        .from("forum_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;

      // Get post counts per category
      const enriched = await Promise.all(
        (categories || []).map(async (cat: any) => {
          const { count } = await supabase
            .from("forum_posts")
            .select("*", { count: "exact", head: true })
            .eq("category_id", cat.id);

          const { data: latest } = await supabase
            .from("forum_posts")
            .select("title, created_at, author_name")
            .eq("category_id", cat.id)
            .order("created_at", { ascending: false })
            .limit(1);

          return {
            ...cat,
            post_count: count || 0,
            latest_post: latest?.[0] || null,
          };
        })
      );
      return enriched;
    },
  });
}

export function useForumPosts(categorySlug: string) {
  return useQuery({
    queryKey: ["forum-posts", categorySlug],
    queryFn: async (): Promise<{ posts: ForumPost[]; category: ForumCategory }> => {
      const { data: cat, error: catErr } = await supabase
        .from("forum_categories")
        .select("*")
        .eq("slug", categorySlug)
        .single();
      if (catErr) throw catErr;

      const { data: posts, error } = await supabase
        .from("forum_posts")
        .select("*")
        .eq("category_id", cat.id)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Get reply counts
      const enriched = await Promise.all(
        (posts || []).map(async (post: any) => {
          const { count } = await supabase
            .from("forum_replies")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);
          return { ...post, reply_count: count || 0 };
        })
      );

      return { posts: enriched, category: cat as ForumCategory };
    },
    enabled: !!categorySlug,
  });
}

export function useForumThread(postId: string) {
  return useQuery({
    queryKey: ["forum-thread", postId],
    queryFn: async () => {
      const { data: post, error: postErr } = await supabase
        .from("forum_posts")
        .select("*")
        .eq("id", postId)
        .single();
      if (postErr) throw postErr;

      const { data: replies, error: repErr } = await supabase
        .from("forum_replies")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (repErr) throw repErr;

      return { post: post as ForumPost, replies: (replies || []) as ForumReply[] };
    },
    enabled: !!postId,
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ categoryId, title, content, authorName }: { categoryId: string; title: string; content: string; authorName: string }) => {
      const { data, error } = await supabase
        .from("forum_posts")
        .insert({ category_id: categoryId, user_id: user!.id, author_name: authorName, title, content })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forum-posts"] });
      qc.invalidateQueries({ queryKey: ["forum-categories"] });
    },
  });
}

export function useCreateReply() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, content, authorName }: { postId: string; content: string; authorName: string }) => {
      const { data, error } = await supabase
        .from("forum_replies")
        .insert({ post_id: postId, user_id: user!.id, author_name: authorName, content })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["forum-thread", vars.postId] });
      qc.invalidateQueries({ queryKey: ["forum-posts"] });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("forum_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forum-posts"] });
      qc.invalidateQueries({ queryKey: ["forum-categories"] });
    },
  });
}

export function useDeleteReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ replyId, postId }: { replyId: string; postId: string }) => {
      const { error } = await supabase.from("forum_replies").delete().eq("id", replyId);
      if (error) throw error;
      return postId;
    },
    onSuccess: (postId) => {
      qc.invalidateQueries({ queryKey: ["forum-thread", postId] });
    },
  });
}
