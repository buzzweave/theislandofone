import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  author: string;
  excerpt: string;
  content: string;
  image_url: string;
  is_published: boolean | number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useBlogPosts(publishedOnly = false) {
  return useQuery({
    queryKey: ["blog_posts", publishedOnly],
    queryFn: async () => {
      let query = supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (publishedOnly) {
        query = query.eq("is_published", true);
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as BlogPost[];
    },
  });
}

export function useAddBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (post: Partial<BlogPost>) => {
      const payload: any = { ...post };
      payload.is_published = payload.is_published === 1 || payload.is_published === true;
      
      const { data, error } = await supabase
        .from("blog_posts")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as BlogPost;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blog_posts"] }),
  });
}

export function useUpdateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BlogPost> & { id: string }) => {
      const payload: any = { ...updates };
      if ("is_published" in payload) {
        payload.is_published = payload.is_published === 1 || payload.is_published === true;
      }
      
      const { data, error } = await supabase
        .from("blog_posts")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as BlogPost;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blog_posts"] }),
  });
}

export function useDeleteBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blog_posts"] }),
  });
}
