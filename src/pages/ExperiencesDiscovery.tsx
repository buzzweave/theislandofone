import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Play, Layers } from "lucide-react";
import { useExperienceSeriesList } from "@/hooks/useExperienceSeries";
import type { ImmersiveExperience } from "@/hooks/useExperiences";

function usePublishedExperiences() {
  return useQuery({
    queryKey: ["immersive_experiences", "published"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("immersive_experiences")
        .select("*")
        .eq("status", "published")
        .in("visibility", ["public", "scheduled"])
        .order("order_index", { ascending: true })
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ImmersiveExperience[];
    },
  });
}

export default function ExperiencesDiscovery() {
  const { data: series = [] } = useExperienceSeriesList({ publishedOnly: true });
  const { data: experiences = [], isLoading } = usePublishedExperiences();

  const grouped = useMemo(() => {
    const map = new Map<string | "standalone", ImmersiveExperience[]>();
    for (const e of experiences) {
      const k = e.series_id ?? "standalone";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return map;
  }, [experiences]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="container mx-auto px-4 py-16 relative">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary mb-3">
            <Sparkles className="h-4 w-4" /> Immersive Experiences
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">Step Inside the Story</h1>
          <p className="text-muted-foreground max-w-2xl">
            Cinematic teachings, guided moments, and interactive encounters designed to bring scripture to life.
          </p>
          <Link
            to="/my/experiences"
            className="inline-flex items-center gap-2 mt-5 text-sm px-4 py-2 rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
          >
            <Play className="h-4 w-4" /> My Library
          </Link>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 space-y-14">
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : experiences.length === 0 ? (
          <p className="text-muted-foreground">No experiences published yet — check back soon.</p>
        ) : (
          <>
            {series.map((s) => {
              const items = grouped.get(s.id) ?? [];
              if (!items.length) return null;
              return (
                <section key={s.id}>
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary/80">
                        <Layers className="h-3.5 w-3.5" /> Series
                      </div>
                      <h2 className="font-display text-2xl md:text-3xl font-semibold">{s.title}</h2>
                      {s.description && (
                        <p className="text-sm text-muted-foreground max-w-2xl mt-1">{s.description}</p>
                      )}
                    </div>
                    <Link to={`/experiences/series/${s.slug}`} className="text-sm text-primary hover:underline shrink-0">
                      View series →
                    </Link>
                  </div>
                  <ExperienceGrid items={items.slice(0, 6)} />
                </section>
              );
            })}

            {(grouped.get("standalone") ?? []).length > 0 && (
              <section>
                <h2 className="font-display text-2xl md:text-3xl font-semibold mb-4">Featured Experiences</h2>
                <ExperienceGrid items={grouped.get("standalone")!} />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function ExperienceGrid({ items }: { items: ImmersiveExperience[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {items.map((e) => (
        <Link
          key={e.id}
          to={`/experiences/${e.slug}`}
          className="group relative rounded-lg overflow-hidden border border-border/40 bg-card hover:border-primary/40 transition"
        >
          <div className="aspect-video relative overflow-hidden bg-muted">
            {e.featured_image || e.poster_url ? (
              <img
                src={e.featured_image || e.poster_url || ""}
                alt={e.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Sparkles className="h-8 w-8" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 text-primary-foreground px-2.5 py-1 text-xs">
                <Play className="h-3 w-3 fill-current" /> Enter
              </span>
              {e.members_only && (
                <span className="rounded-full bg-amber-500/90 text-white px-2 py-0.5 text-[10px] uppercase tracking-wider">
                  Members
                </span>
              )}
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-semibold group-hover:text-primary transition">{e.title}</h3>
            {e.short_description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{e.short_description}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
