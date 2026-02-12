import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  author: string;
  excerpt: string;
  content: string;
  image_url: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useBlogPosts(publishedOnly = false) {
  return useQuery({
    queryKey: ["blog_posts", publishedOnly],
    queryFn: () => api.get<BlogPost[]>(`/api/blog-posts${publishedOnly ? "?published=true" : ""}`),
  });
}

export function useAddBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (post: Omit<BlogPost, "id" | "created_at" | "updated_at">) =>
      api.post("/api/blog-posts", post),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blog_posts"] }),
  });
}

export function useUpdateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<BlogPost> & { id: string }) =>
      api.put(`/api/blog-posts/${id}`, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blog_posts"] }),
  });
}

export function useDeleteBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/blog-posts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blog_posts"] }),
  });
}
