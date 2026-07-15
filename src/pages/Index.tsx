import { Link } from "react-router-dom";
import { useState, lazy, Suspense, memo } from "react";
import { ArrowRight, BookOpen, Mic, Play, PenLine, X } from "lucide-react";
import HeroCarousel from "@/components/HeroCarousel";
import LazySection from "@/components/LazySection";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSermonsEnabled } from "@/hooks/useSermonsEnabled";
import { supabaseImageUrl, supabaseImageSrcSet } from "@/lib/supabaseImage";
import CurrentSeriesFeature from "@/components/home/CurrentSeriesFeature";

const SubscribeForm = lazy(() => import("@/components/SubscribeForm"));

function getYouTubeId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/))([^?&/]+)/);
  return match ? match[1] : "";
}

/** Fetch only the columns the homepage actually uses */
function useHomepageBooks() {
  return useQuery({
    queryKey: ["books_homepage"],
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("id, title, subtitle, price, is_free, category, cover_image, featured")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });
}

function useHomepageSermons() {
  return useQuery({
    queryKey: ["sermons_homepage"],
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sermons")
        .select("id, title, scripture, excerpt, category, access_level, featured")
        .eq("featured", true)
        .order("sort_order", { ascending: true })
        .limit(3);
      if (error) throw new Error(error.message);
      return data || [];
    },
  });
}

function useHomepageVideos() {
  return useQuery({
    queryKey: ["videos_homepage"],
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("id, title, youtube_url, thumbnail, duration, category, featured, is_free, price")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });
}

function useHomepageGraphics() {
  return useQuery({
    queryKey: ["graphics_homepage"],
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("graphics")
        .select("id, title, category, price, preview_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(6);
      if (error) throw new Error(error.message);
      return data || [];
    },
  });
}

function useHomepageBlog() {
  return useQuery({
    queryKey: ["blog_posts_homepage"],
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, author, excerpt, image_url, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw new Error(error.message);
      return data || [];
    },
  });
}

function useHomepageMembershipPlans() {
  return useQuery({
    queryKey: ["membership_plans_homepage"],
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_plans")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });
}

const BookCard = memo(({ book, priority = false }: { book: any; priority?: boolean }) => (
  <Link
    to="/books"
    className="group flex flex-col items-center rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-gold p-3 sm:p-4"
  >
    <div className="flex items-center justify-center overflow-hidden bg-[#0f172a] rounded-[10px] w-[150px] h-[235px] sm:w-[180px] sm:h-[280px]">
      {book.cover_image ? (
        <img
          src={supabaseImageUrl(book.cover_image, { width: 500, quality: 72 })}
          srcSet={supabaseImageSrcSet(book.cover_image, [300, 500, 800], 72)}
          alt={book.title}
          className="w-full h-full object-contain object-center block transition-transform duration-500 group-hover:scale-105"
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          fetchPriority={priority ? "high" : "auto"}
          sizes="180px"
        />
      ) : (
        <BookOpen className="h-12 w-12 text-muted-foreground" />
      )}
    </div>

    <div className="pt-4 text-center w-full">
      <h3 className="font-display text-base sm:text-lg font-semibold mb-1 line-clamp-1">{book.title}</h3>
      <p className="text-muted-foreground text-xs sm:text-sm mb-2 line-clamp-2">{book.subtitle}</p>
      <span className="text-primary text-sm font-semibold">
        {book.is_free ? "Free Download" : `$${book.price}`}
      </span>
    </div>
  </Link>
));
BookCard.displayName = "BookCard";

/* ── Above-fold: Hero + Featured Books ─────────────────────── */

function FeaturedBooksSection() {
  const { data: books = [] } = useHomepageBooks();
  const featuredBooks = books.filter((b: any) => b.featured);
  if (featuredBooks.length === 0) return null;
  return (
    <section className="bg-gradient-section py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 sm:mb-16">
          <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">Library</p>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">Featured Books</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto items-start">
          {featuredBooks.map((book: any, i: number) => (
            <BookCard key={book.id} book={book} priority={i < 3} />
          ))}
        </div>
        <div className="text-center mt-10 sm:mt-12">
          <Link to="/books" className="text-primary text-sm font-semibold hover:underline inline-flex items-center gap-1">
            View All Books <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-12 sm:mt-16 text-center">
          <div className="inline-block rounded-2xl bg-primary/10 border border-primary/20 px-8 sm:px-12 py-8 sm:py-10">
            <h3 className="font-display text-xl sm:text-2xl font-bold mb-3">Join & Save as a Member</h3>
            <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto mb-6">
              Unlock exclusive books, sermons, and resources. Support our ministry and grow in your faith journey.
            </p>
            <Link
              to="/membership"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-gold"
            >
              Support Our Ministry <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Below-fold sections (rendered on scroll) ────────────── */

function SermonsSection() {
  const { data: sermons = [] } = useHomepageSermons();
  if (sermons.length === 0) return null;
  return (
    <section className="py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 sm:mb-16">
          <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">For Pastors</p>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">Latest Sermons</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          {sermons.slice(0, 3).map((sermon: any) => (
            <Link
              key={sermon.id}
              to={`/sermons/${sermon.id}`}
              className="group p-5 sm:p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">{sermon.category}</span>
                {sermon.access_level !== "free" && (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {sermon.access_level}
                  </span>
                )}
              </div>
              <h3 className="font-display text-lg sm:text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{sermon.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{sermon.scripture}</p>
              <p className="text-sm text-muted-foreground line-clamp-2">{sermon.excerpt}</p>
            </Link>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mt-10 sm:mt-12">
          <Link to="/sermons" className="text-primary text-sm font-semibold hover:underline inline-flex items-center gap-1">
            Browse Sermon Library <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-primary/30 text-sm font-semibold text-foreground hover:bg-primary/10 transition-colors"
          >
            <PenLine className="h-4 w-4 text-primary" /> Visit the Blog
          </Link>
        </div>
        <div className="mt-12 sm:mt-16 text-center">
          <div className="inline-block rounded-2xl bg-primary/10 border border-primary/20 px-8 sm:px-12 py-8 sm:py-10">
            <h3 className="font-display text-xl sm:text-2xl font-bold mb-3">Become a Member Today</h3>
            <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto mb-6">
              Get full access to every sermon, book, and resource. Join our community and support the ministry.
            </p>
            <Link
              to="/membership"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-gold"
            >
              Support Our Ministry <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function BlogSection() {
  const { data: blogPosts = [] } = useHomepageBlog();
  if (blogPosts.length === 0) return null;
  return (
    <section className="bg-gradient-section py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 sm:mb-16">
          <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">Blog</p>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">Latest Blog Posts</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {blogPosts.map((post: any) => (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              className="group rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all duration-300"
            >
              {post.image_url && (
                <div className="aspect-video overflow-hidden bg-muted">
                  <img src={supabaseImageUrl(post.image_url, { width: 800, quality: 70 })} srcSet={supabaseImageSrcSet(post.image_url, [400, 800, 1200], 70)} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" alt={post.title} width={800} height={450} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
                </div>
              )}
              <div className="p-4 sm:p-5">
                <p className="text-xs text-muted-foreground mb-1">{post.author} · {post.published_at ? new Date(post.published_at).toLocaleDateString() : ""}</p>
                <h3 className="font-display text-lg font-semibold mb-2 group-hover:text-primary transition-colors">{post.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-10 sm:mt-12">
          <Link to="/blog" className="text-primary text-sm font-semibold hover:underline inline-flex items-center gap-1">
            View All Posts <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function VideosSection() {
  const { data: videos = [] } = useHomepageVideos();
  const featuredVideos = videos.filter((v: any) => v.featured);
  const premiumVideos = videos.filter((v: any) => !v.is_free && v.price > 0);
  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <>
      {featuredVideos.length > 0 && (
        <section className="bg-gradient-section py-16 sm:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10 sm:mb-16">
              <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">Watch</p>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">Featured Videos</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
              {featuredVideos.map((video: any) => {
                const ytId = getYouTubeId(video.youtube_url);
                const thumb = video.thumbnail || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : "");
                const isPlaying = playingId === video.id;
                return (
                  <div
                    key={video.id}
                    className="group rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="relative aspect-video overflow-hidden">
                      {isPlaying && ytId ? (
                        <>
                          <iframe
                            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                            title={video.title}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            loading="lazy"
                          />
                          <button
                            onClick={() => setPlayingId(null)}
                            className="absolute top-2 right-2 z-10 p-1 rounded-full bg-background/80 text-foreground hover:bg-background transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <div className="cursor-pointer" onClick={() => ytId && setPlayingId(video.id)}>
                          {thumb ? (
                            <img src={thumb} alt={video.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Play className="h-10 w-10 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-full bg-primary/90 flex items-center justify-center">
                              <Play className="h-5 sm:h-6 w-5 sm:w-6 text-primary-foreground ml-0.5" />
                            </div>
                          </div>
                          <span className="absolute bottom-2 right-2 text-xs bg-background/80 px-2 py-0.5 rounded text-foreground">{video.duration}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3 sm:p-4">
                      <p className="text-xs text-primary uppercase tracking-wider mb-1">{video.category}</p>
                      <h3 className="font-display text-sm font-semibold">{video.title}</h3>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-10 sm:mt-12">
              <Link to="/videos" className="text-primary text-sm font-semibold hover:underline inline-flex items-center gap-1">
                View All Videos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {premiumVideos.length > 0 && (
        <section className="bg-gradient-section py-16 sm:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10 sm:mb-16">
              <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">Premium</p>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">Videos for Sale</h2>
              <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Premium video content available for purchase.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {premiumVideos.slice(0, 6).map((video: any) => {
                const ytId = getYouTubeId(video.youtube_url);
                const thumb = video.thumbnail || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : "");
                return (
                  <Link
                    key={video.id}
                    to="/videos"
                    className="group rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="relative aspect-video overflow-hidden bg-muted">
                      {thumb ? (
                        <img src={thumb} alt={video.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Play className="h-10 w-10 text-muted-foreground" /></div>
                      )}
                      <span className="absolute bottom-2 right-2 text-xs bg-background/80 px-2 py-0.5 rounded text-foreground">{video.duration}</span>
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-primary uppercase tracking-wider mb-1">{video.category}</p>
                      <h3 className="font-display text-sm font-semibold group-hover:text-primary transition-colors">{video.title}</h3>
                      <span className="text-sm font-bold text-primary mt-1 block">${video.price}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="text-center mt-10 sm:mt-12">
              <Link to="/videos" className="text-primary text-sm font-semibold hover:underline inline-flex items-center gap-1">
                View All Videos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function GraphicsSection() {
  const { data: graphics = [] } = useHomepageGraphics();
  if (graphics.length === 0) return null;
  return (
    <section className="py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 sm:mb-16">
          <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">Church Media</p>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">Social Media Graphics</h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Professional graphics for your church screens and social media.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {graphics.slice(0, 6).map((graphic: any) => (
            <Link
              key={graphic.id}
              to="/graphics"
              className="group rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all duration-300"
            >
              <div className="aspect-video overflow-hidden bg-muted">
                <img src={supabaseImageUrl(graphic.preview_url, { width: 600, quality: 70 })} srcSet={supabaseImageSrcSet(graphic.preview_url, [400, 600, 900], 70)} alt={graphic.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" width={600} height={338} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
              </div>
              <div className="p-4">
                <p className="text-xs text-primary uppercase tracking-wider mb-1">{graphic.category}</p>
                <h3 className="font-display text-sm font-semibold group-hover:text-primary transition-colors">{graphic.title}</h3>
                <span className="text-sm font-bold text-primary mt-1 block">${graphic.price}</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-10 sm:mt-12">
          <Link to="/graphics" className="text-primary text-sm font-semibold hover:underline inline-flex items-center gap-1">
            View All Graphics <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function MembershipSection() {
  const { data: plans = [] } = useHomepageMembershipPlans();
  const visiblePlans = plans.filter((p: any) => p.is_visible);
  if (visiblePlans.length === 0) return null;
  return (
    <section className="py-16 sm:py-24">
      <div className="container mx-auto px-4 text-center">
        <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">Community</p>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">Join the Inner Circle</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-10 sm:mb-12 text-base sm:text-lg">
          Get exclusive access to sermons, books, live sessions, and a community of believers walking the same path.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {visiblePlans.map((plan: any) => (
            <div
              key={plan.id}
              className={`rounded-xl border p-5 sm:p-6 text-left transition-all duration-300 ${
                plan.is_featured
                  ? "border-primary bg-primary/5 shadow-gold"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <h3 className="font-display text-lg sm:text-xl font-semibold mb-1">{plan.name}</h3>
              <p className="text-2xl sm:text-3xl font-bold text-primary mb-4">
                ${plan.price}<span className="text-sm text-muted-foreground font-normal">/mo</span>
              </p>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f: string) => (
                  <li key={f} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/membership"
                className={`block text-center py-2.5 rounded-full text-sm font-semibold transition-colors ${
                  plan.is_featured
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-primary/30 text-foreground hover:bg-primary/10"
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Main Index Page ───────────────────────────────────────── */

export default function Index() {
  const { enabled: sermonsEnabled } = useSermonsEnabled();

  return (
    <div>
      {/* HERO — eagerly loaded, above fold */}
      <HeroCarousel />

      {/* CURRENT IMMERSIVE SERIES — admin-controlled, hides itself when unset */}
      <CurrentSeriesFeature />

      {/* FEATURED BOOKS — eagerly loaded, first content section */}
      <FeaturedBooksSection />

      {/* Everything below is deferred until user scrolls near it */}
      {sermonsEnabled && (
        <LazySection minHeight="400px">
          <SermonsSection />
        </LazySection>
      )}

      <LazySection minHeight="400px">
        <BlogSection />
      </LazySection>

      <LazySection minHeight="400px">
        <VideosSection />
      </LazySection>

      <LazySection minHeight="400px">
        <GraphicsSection />
      </LazySection>

      <LazySection minHeight="300px">
        <MembershipSection />
      </LazySection>

      <LazySection minHeight="200px">
        <section className="bg-gradient-section py-16 sm:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <Mic className="h-8 sm:h-10 w-8 sm:w-10 text-primary mx-auto mb-4 sm:mb-6" />
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">Book Bryant Clark to Speak</h2>
              <p className="text-muted-foreground text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed px-2">
                Invite Bryant Clark to your church, conference, or event. Powerful messages on faith, leadership, and purpose.
              </p>
              <Link
                to="/speaking"
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-gold"
              >
                Request a Speaker <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </LazySection>

      <LazySection minHeight="150px">
        <section className="py-16 sm:py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Stay Connected</h2>
            <p className="text-muted-foreground mb-6 sm:mb-8 max-w-lg mx-auto text-sm sm:text-base">
              Get weekly devotionals, book updates, and exclusive content delivered to your inbox.
            </p>
            <Suspense fallback={<div className="h-12" />}>
              <SubscribeForm />
            </Suspense>
          </div>
        </section>
      </LazySection>
    </div>
  );
}
