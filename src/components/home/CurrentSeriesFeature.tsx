import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Play, PlayCircle, Film, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentSeries } from "@/hooks/useCurrentSeries";
import { supabase } from "@/integrations/supabase/client";
import { isYouTubeUrl, toYouTubeEmbed } from "@/lib/youtube";

function formatRuntime(seconds: number | null | undefined) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

function useDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return desktop;
}

export default function CurrentSeriesFeature() {
  const { data: series } = useCurrentSeries({ requireHomepage: true });
  const [signedIn, setSignedIn] = useState(false);
  const [hasProgress, setHasProgress] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  const desktop = useDesktop();

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      setSignedIn(!!data.user);
      if (data.user && series?.featured_experience_id) {
        const { data: p } = await (supabase as any)
          .from("experience_view_progress")
          .select("id, completed")
          .eq("user_id", data.user.id)
          .eq("experience_id", series.featured_experience_id)
          .maybeSingle();
        if (!cancelled) setHasProgress(!!p && !p.completed);
      }
    });
    return () => { cancelled = true; };
  }, [series?.featured_experience_id]);

  // IntersectionObserver — pause preview off-screen
  useEffect(() => {
    if (!videoRef.current || !containerRef.current) return;
    const v = videoRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) v.play().catch(() => {});
          else v.pause();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(containerRef.current);
    return () => io.disconnect();
  }, [series?.homepage_preview_video_url]);

  if (!series) return null;

  const experience = series.featured_experience ?? null;
  const experienceHref = experience ? `/experiences/${experience.slug}` : `/series/${series.slug}`;
  const seriesHref = `/series/${series.slug}`;
  const headline = series.homepage_headline || series.title;
  const description = series.homepage_description || series.description || "";
  const primary = series.primary_watch_label || "Watch Experience";
  const secondary = series.secondary_watch_label || "View Series";
  const artwork = series.homepage_artwork_url || series.artwork_url;
  const mobileArtwork = series.homepage_mobile_artwork_url || artwork;
  const preview = series.homepage_preview_video_url;
  const trailer = series.trailer_url;
  const runtime = experience ? formatRuntime(experience.runtime_seconds) : null;
  const scripture = experience?.primary_scripture || null;
  const premiere = experience?.premiere_at ? new Date(experience.premiere_at) : null;

  const stopBubble = (fn?: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    fn?.();
  };

  const showVideo = desktop && !reducedMotion && !!preview;

  return (
    <section className="relative bg-background border-b border-border/40" aria-label="Current series">
      <Link
        to={experienceHref}
        className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div ref={containerRef} className="relative overflow-hidden">
          {/* Background */}
          <picture>
            {mobileArtwork && <source media="(max-width: 767px)" srcSet={mobileArtwork} />}
            <img
              src={artwork || ""}
              alt=""
              aria-hidden
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </picture>
          {showVideo && (
            <video
              ref={videoRef}
              src={preview!}
              poster={artwork || undefined}
              muted
              loop
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-cover opacity-90"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10 md:bg-gradient-to-r md:from-background md:via-background/80 md:to-transparent" />

          {/* Content */}
          <div className="relative container mx-auto px-4 py-12 md:py-24 lg:py-28 max-w-6xl min-h-[420px] md:min-h-[520px] flex md:items-center">
            <div className="max-w-xl text-left space-y-4 md:space-y-5">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary">
                <Film className="h-3.5 w-3.5" /> Current Series
              </div>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                {headline}
              </h2>
              {experience?.title && experience.title !== headline && (
                <p className="text-lg md:text-xl text-primary font-medium">{experience.title}</p>
              )}
              {description && (
                <p className="text-base md:text-lg text-foreground/85 leading-relaxed line-clamp-4">
                  {description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm text-muted-foreground">
                {scripture && <span>{scripture}</span>}
                {runtime && <span aria-label="runtime">{runtime}</span>}
                {premiere && premiere > new Date() && (
                  <span>Premieres {premiere.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild size="lg" onClick={stopBubble()} className="shadow-gold">
                  <Link to={experienceHref}>
                    <PlayCircle className="h-5 w-5 mr-2" /> {primary}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" onClick={stopBubble()}>
                  <Link to={seriesHref}>{secondary}</Link>
                </Button>
                {trailer && (
                  <Button size="lg" variant="ghost" onClick={stopBubble(() => setTrailerOpen(true))}>
                    <Play className="h-4 w-4 mr-2" /> Watch Trailer
                  </Button>
                )}
                {signedIn && hasProgress && experience && (
                  <Button asChild size="lg" variant="ghost" onClick={stopBubble()}>
                    <Link to={experienceHref}>Continue Watching</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>

      {trailer && (
        <Dialog open={trailerOpen} onOpenChange={setTrailerOpen}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-0">
            <DialogHeader className="sr-only"><DialogTitle>Trailer</DialogTitle></DialogHeader>
            <button
              onClick={() => setTrailerOpen(false)}
              className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="aspect-video w-full">
              {/\.(mp4|webm|mov)$/i.test(trailer) ? (
                <video src={trailer} controls autoPlay className="h-full w-full" />
              ) : (
                <iframe
                  src={trailer}
                  className="h-full w-full"
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                  title="Series trailer"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
