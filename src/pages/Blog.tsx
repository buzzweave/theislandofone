import { Link } from "react-router-dom";
import { ArrowRight, PenLine, Calendar, User } from "lucide-react";
import { useBlogPosts } from "@/hooks/useBlogPosts";
import { format } from "date-fns";
import { supabaseImageUrl, supabaseImageSrcSet } from "@/lib/supabaseImage";

export default function Blog() {
  const { data: posts, isLoading } = useBlogPosts(true);

  return (
    <div className="min-h-screen">
      <section className="py-14 sm:py-20 bg-gradient-section">
        <div className="container mx-auto px-4 text-center">
          <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">Insights</p>
          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold mb-4">Blog</h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            Thoughts on faith, leadership, ministry, and the journey of standing alone with God.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl bg-muted h-80" />
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition-all"
              >
                {post.image_url && (
                <div className="relative aspect-[16/9] overflow-hidden bg-black/40 flex items-center justify-center">
                    <img
                      src={supabaseImageUrl(post.image_url, { width: 800, quality: 70 })}
                      srcSet={supabaseImageSrcSet(post.image_url, [400, 800, 1200], 70)}
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      alt={post.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                      width={640}
                      height={360}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                      <span className="text-white/20 font-display text-2xl sm:text-3xl font-bold rotate-[-25deg] whitespace-nowrap">
                        The Island of One
                      </span>
                    </div>
                  </div>
                )}
                <div className="p-5">
                  <h2 className="font-display text-lg font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-3">{post.excerpt}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {post.author && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {post.author}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(post.published_at || post.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto text-center">
            <PenLine className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="font-display text-2xl font-bold mb-4">Coming Soon</h2>
            <p className="text-muted-foreground mb-8">
              Blog posts are on the way. Stay tuned for devotionals, ministry insights, and behind-the-scenes stories.
            </p>
            <Link
              to="/sermons"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Browse Sermons <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
