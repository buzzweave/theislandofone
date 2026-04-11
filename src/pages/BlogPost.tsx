import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, User, Headphones } from "lucide-react";
import DOMPurify from "dompurify";
import { format } from "date-fns";
import SocialShareLinks from "@/components/SocialShareLinks";
import CommentsWithRating from "@/components/CommentsWithRating";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripEmptyParagraphs(html: string) {
  return (
    String(html ?? "")
      // remove <p><br></p> and <p>&nbsp;</p> and empty p blocks
      .replace(/<p>\s*(<br\s*\/?>|\&nbsp;|\s)*\s*<\/p>/gi, "")
      // collapse 3+ <br> down to 2
      .replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>")
      .trim()
  );
}

function plainTextToHtml(text: string) {
  const t = String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // collapse 3+ blank lines down to 2 (prevents double spacing explosions)
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!t) return "";

  const escaped = escapeHtml(t);

  // paragraphs split by blank line(s)
  const paragraphs = escaped.split(/\n\s*\n/);

  // within each paragraph, preserve single newlines as <br>
  const html = paragraphs.map((p) => `<p>${p.replace(/\n/g, "<br />")}</p>`).join("");

  return html;
}

function sanitizeBlogHtml(inputHtml: string) {
  const cleaned = stripEmptyParagraphs(inputHtml);

  return DOMPurify.sanitize(cleaned, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "em", "i", "u", "blockquote",
      "h1", "h2", "h3", "h4", "ul", "ol", "li", "a", "span", "div", "img",
      "video", "source",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "title", "class", "style", "controls", "type", "preload"],
  });
}

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

      if (error) throw new Error("Not found");
      return data;
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (!post) return;

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const url = `https://theislandofone.com/blog/${slug}`;
    setMeta("og:title", post.title);
    setMeta("og:description", post.excerpt || "Faith, healing, and belonging for the ones who felt alone.");
    setMeta("og:image", post.image_url || "https://theislandofone.lovable.app/share.png");
    setMeta("og:url", url);
    setMeta("og:type", "article");
    document.title = `${post.title} | The Island of One`;
  }, [post, slug]);

  const safeHtml = useMemo(() => {
    if (!post?.content) return "";

    const raw = String(post.content ?? "");

    // detect “real HTML”
    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(raw);

    // if plain text, convert to HTML paragraphs so spacing matches what you pasted
    const asHtml = looksLikeHtml ? raw : plainTextToHtml(raw);

    return sanitizeBlogHtml(asHtml);
  }, [post?.content]);

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

  return (
    <div className="min-h-screen">
      {post.image_url && (
        <div className="relative w-full bg-black/40">
          <img src={post.image_url} alt={post.title} className="w-full h-auto object-contain max-h-[600px] mx-auto" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="text-white/15 font-display text-4xl sm:text-5xl md:text-6xl font-bold rotate-[-25deg] whitespace-nowrap">
              The Island of One
            </span>
          </div>
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

        {(post as any).video_url && (
          <div className="my-6 rounded-xl overflow-hidden border border-border">
            <video
              src={(post as any).video_url}
              controls
              preload="metadata"
              className="w-full max-h-[500px]"
            />
          </div>
        )}

        <div
          className="blog-content sermon-flow [&_*]:!text-foreground"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />

        <style>{`
          .blog-content {
            font-size: 18px;
            line-height: 1.75;
          }

          /* Prevent huge gaps, keep it looking like the original post */
          .blog-content p {
            margin: 0 0 14px 0;
          }
          .blog-content p:empty {
            display: none;
          }

          /* Preserve bold */
          .blog-content strong,
          .blog-content b {
            font-weight: 800;
          }

          /* Drop cap on first paragraph */
          .blog-content p:first-of-type::first-letter {
            float: left;
            font-size: 3.4em;
            line-height: 0.9;
            padding-right: 10px;
            padding-top: 6px;
            font-weight: 800;
          }

          .blog-content a {
            text-decoration: underline;
          }

          .blog-content ul,
          .blog-content ol {
            margin: 10px 0 14px 22px;
          }
          .blog-content li {
            margin: 6px 0;
          }

          .blog-content blockquote {
            border-left: 4px solid rgba(255,255,255,0.25);
            padding-left: 14px;
            margin: 16px 0;
            opacity: 0.95;
          }

          .blog-content img {
            max-width: 100%;
            height: auto;
            border-radius: 12px;
            margin: 14px 0;
          }
        `}</style>

        <p className="mt-10 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} The Island of One Ministries. All rights reserved. For personal use only.
        </p>

        <div className="mt-4 pt-6 border-t border-border">
          <SocialShareLinks
            title={post.title}
            url={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-blog?slug=${encodeURIComponent(slug || "")}`}
            pageUrl={`https://theislandofone.com/blog/${slug}`}
            description={post.excerpt || ""}
          />
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <CommentsWithRating contentType="blog" contentId={post.id} />
        </div>
      </article>
    </div>
  );
}
