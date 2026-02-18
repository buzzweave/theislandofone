import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { extractParagraphs } from "@/lib/textFormat";
import SocialShareLinks from "@/components/SocialShareLinks";
import FacebookComments from "@/components/FacebookComments";
import { cn } from "@/lib/utils";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog_post", slug],
    queryFn: () => api.get(`/api/blog-posts/by-slug/${slug}`),
    enabled: !!slug,
  });

  useEffect(() => {
    if (!post) return;
    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    const url = `https://theislandofone.lovable.app/blog/${slug}`;
    setMeta('og:title', post.title);
    setMeta('og:description', post.excerpt || 'Faith, healing, and belonging for the ones who felt alone.');
    setMeta('og:image', post.image_url || 'https://theislandofone.lovable.app/logo.png');
    setMeta('og:url', url);
    setMeta('og:type', 'article');
    document.title = `${post.title} | The Island of One`;
  }, [post, slug]);

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

  let paragraphs = extractParagraphs(post.content || "");

  // Skip first paragraph if it just repeats the post title
  if (paragraphs.length > 1) {
    const first = paragraphs[0].toLowerCase().replace(/[^a-z]/g, "");
    const postTitle = post.title.toLowerCase().replace(/[^a-z]/g, "");
    if (first === postTitle || first.length <= 2) {
      paragraphs = paragraphs.slice(1);
    }
  }

  return (
    <div className="min-h-screen">
      {post.image_url && (
        <div className="w-full bg-black/40">
          <img
            src={post.image_url}
            alt={post.title}
            className="w-full h-auto object-contain max-h-[600px] mx-auto"
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
        <div className="blog-post-prose">
          {paragraphs.map((text, index) => (
            <p key={index} className={cn(index === 0 && "blog-drop-cap")}>
              {text}
            </p>
          ))}
        </div>
        <p className="mt-10 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} The Island of One Ministries. All rights reserved. For personal use only.
        </p>
        <div className="mt-4 pt-6 border-t border-border">
          <SocialShareLinks title={post.title} />
        </div>
        <div className="mt-6 pt-6 border-t border-border">
          <FacebookComments slug={slug!} />
        </div>
      </article>
    </div>
  );
}
