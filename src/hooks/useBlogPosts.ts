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
    queryFn: async () => {
      const posts = await api.get<BlogPost[]>("/api/blog");
      if (publishedOnly) return posts.filter((p) => p.is_published);
      return posts;
    },
  });
}

export function useAddBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (post: Partial<BlogPost>) => api.post<BlogPost>("/api/blog", post),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blog_posts"] }),
  });
}

export function useUpdateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<BlogPost> & { id: string }) =>
      api.put<BlogPost>(`/api/blog/${id}`, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blog_posts"] }),
  });
}

export function useDeleteBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/blog/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blog_posts"] }),
  });
}
