import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useHeroBanners } from "@/hooks/useHeroBanners";
import { supabaseImageUrl, supabaseImageSrcSet } from "@/lib/supabaseImage";

// Stable public URL — matches the preload link in index.html so the browser reuses the same request
const heroBgFallback = "/hero-bg.jpg";

export default function HeroCarousel() {
  const { banners } = useHeroBanners();
  const [current, setCurrent] = useState(0);

  const slides = banners.length > 0
    ? banners
    : [
        {
          id: "fallback",
          title: "The Island\nof One",
          subtitle: "Empowering believers to stand firm in faith, discover purpose in solitude, and lead with unshakeable conviction.",
          image_url: "",
          cta_text: "Explore Books",
          cta_link: "/books",
          sort_order: 0,
          is_active: true,
          created_at: "",
          updated_at: "",
        },
      ];

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[current];

  const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length);
  const next = () => setCurrent((c) => (c + 1) % slides.length);

  // Only render current + adjacent slides to reduce DOM and network load
  const visibleIndices = new Set<number>();
  visibleIndices.add(current);
  if (slides.length > 1) {
    visibleIndices.add((current + 1) % slides.length);
    visibleIndices.add((current - 1 + slides.length) % slides.length);
  }

  return (
    <section className="relative min-h-[55vh] sm:min-h-[70vh] md:min-h-[80vh] lg:min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background — only render current + adjacent slides */}
      {slides.map((s, i) =>
        visibleIndices.has(i) ? (
          <img
            key={s.id}
            src={s.image_url ? supabaseImageUrl(s.image_url, { width: 1280, quality: 70 }) : heroBgFallback}
            srcSet={s.image_url ? supabaseImageSrcSet(s.image_url, [640, 1024, 1600], 70) : undefined}
            sizes="100vw"
            alt=""
            fetchPriority={i === current ? "high" : "auto"}
            loading={i === current ? "eager" : "lazy"}
            decoding={i === current ? "sync" : "async"}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ${
              i === current ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : null
      )}
      <div className="absolute inset-0 bg-gradient-hero" />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 text-center animate-fade-up">
        <p className="text-primary font-body text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] uppercase mb-4 sm:mb-6">
          Author · Speaker · Pastor
        </p>
        <h1 className="font-display text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-bold leading-tight mb-4 sm:mb-6 whitespace-pre-line">
          {slide.title.includes("\n") ? (
            slide.title.split("\n").map((line, i) => (
              <span key={i}>
                {i === 1 ? <span className="text-gradient-gold">{line}</span> : line}
                {i === 0 && <br />}
              </span>
            ))
          ) : (
            <span className="text-gradient-gold">{slide.title}</span>
          )}
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-6 sm:mb-8 md:mb-10 leading-relaxed px-2">
          {slide.subtitle}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
          {slide.cta_text && slide.cta_link && (
            <Link
              to={slide.cta_link}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-gold"
            >
              {slide.cta_text} <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <Link
            to="/sermons"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-full border border-primary/30 text-foreground font-semibold text-sm hover:bg-primary/10 transition-all"
          >
            Browse Sermons
          </Link>
        </div>
        {/* Membership CTA – visible on mobile & tablet only */}
        <Link
          to="/membership"
          className="lg:hidden mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-full bg-primary/15 border border-primary/40 text-primary font-semibold text-sm hover:bg-primary/25 transition-all"
        >
          Join & Support Our Ministry <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-1.5 sm:p-2 rounded-full bg-background/30 backdrop-blur-sm text-foreground hover:bg-background/50 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-1.5 sm:p-2 rounded-full bg-background/30 backdrop-blur-sm text-foreground hover:bg-background/50 transition-colors"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === current ? "bg-primary w-6" : "bg-foreground/30"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
