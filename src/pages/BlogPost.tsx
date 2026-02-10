import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import SocialShareLinks from "@/components/SocialShareLinks";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog_post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug!)
        .eq("is_published", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="font-display text-2xl font-bold">Post not found</h1>
        <Link to="/blog" className="text-primary hover:underline flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Blog
        </Link>
      </div>
    );
  }

  const isHtml = post.content?.includes("<") && post.content?.includes(">");

  return (
    <div className="min-h-screen">
      {post.image_url && (
        <div className="w-full aspect-[21/9] sm:aspect-[3/1] max-h-[420px] overflow-hidden">
          <img
            src={post.image_url}
            alt={post.title}
            className="w-full h-full object-cover object-center"
          />
        </div>
      )}
      <article className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-3xl">
        <Link to="/blog" className="text-primary hover:underline flex items-center gap-1 text-sm mb-6 sm:mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to Blog
        </Link>
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-4">{post.title}</h1>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-muted-foreground mb-6 sm:mb-8">
          {post.author && (
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" /> {post.author}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {format(new Date(post.published_at || post.created_at), "MMMM d, yyyy")}
          </span>
        </div>
        {isHtml ? (
          <div
            className="prose prose-sm sm:prose-base prose-neutral dark:prose-invert max-w-none
              prose-headings:font-display prose-headings:font-bold
              prose-p:leading-relaxed prose-p:mb-4
              prose-li:leading-relaxed
              prose-blockquote:border-primary prose-blockquote:italic"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        ) : (
          <div
            className="prose prose-sm sm:prose-base prose-neutral dark:prose-invert max-w-none
              prose-headings:font-display prose-headings:font-bold
              prose-p:leading-relaxed prose-p:mb-4"
          >
            {post.content.split(/\n\n+/).map((paragraph, i) => (
              <p key={i}>{paragraph.trim()}</p>
            ))}
          </div>
        )}
        <div className="mt-10 pt-6 border-t border-border">
          <SocialShareLinks title={post.title} />
        </div>
      </article>
    </div>
  );
}
