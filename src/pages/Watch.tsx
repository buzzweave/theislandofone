import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PlayCircle, Sparkles, Film, Clock, Flame, CalendarDays, Bookmark, Layers, Tag, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCurrentSeries } from "@/hooks/useCurrentSeries";
import { useExperienceSeriesList } from "@/hooks/useExperienceSeries";
import { useMyProgress } from "@/hooks/useSavedExperiences";
import type { ImmersiveExperience } from "@/hooks/useExperiences";

function usePublishedExperiences() {
  return useQuery({
    queryKey: ["watch", "published"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("immersive_experiences")
        .select("*")
        .eq("status", "published")
        .in("visibility", ["public", "scheduled"])
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ImmersiveExperience[];
    },
  });
}

function useUpcomingPremiere() {
  return useQuery({
    queryKey: ["watch", "upcoming"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("immersive_experiences")
        .select("*")
        .not("premiere_at", "is", null)
        .gt("premiere_at", new Date().toISOString())
        .order("premiere_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return (data as ImmersiveExperience | null) ?? null;
    },
  });
}

function ExperienceCard({ e, badge }: { e: ImmersiveExperience; badge?: string }) {
  const img = e.mobile_image || e.featured_image || e.poster_url;
  return (
    <Link
      to={`/experiences/${e.slug}`}
      className="group block rounded-lg overflow-hidden bg-card border border-border/40 hover:border-primary/60 transition-all"
    >
      <div className="relative aspect-video bg-muted">
        {img ? (
          <img src={img} alt={e.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/30 to-background" />
        )}
        {badge && (
          <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-black/70 text-white backdrop-blur">
            {badge}
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <PlayCircle className="absolute bottom-2 right-2 h-6 w-6 text-white opacity-80 group-hover:opacity-100" />
      </div>
      <div className="p-3">
        <h3 className="font-display text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">{e.title}</h3>
        {e.short_description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{e.short_description}</p>}
      </div>
    </Link>
  );
}

function Row({ title, icon: Icon, children, action }: { title: string; icon: any; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <h2 className="font-display text-xl md:text-2xl font-semibold flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" /> {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function Watch() {
  useEffect(() => { document.title = "Watch · The Island of One"; }, []);

  const { data: current } = useCurrentSeries();
  const { data: experiences = [] } = usePublishedExperiences();
  const { data: seriesList = [] } = useExperienceSeriesList({ publishedOnly: true });
  const { data: upcoming } = useUpcomingPremiere();
  const { data: progress = [] } = useMyProgress();

  const continueWatching = useMemo(
    () => (progress as any[]).filter((p) => p.experience && !p.completed).slice(0, 8),
    [progress]
  );

  const latest = useMemo(() => experiences.slice(0, 8), [experiences]);

  const popular = useMemo(
    () => [...experiences].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)).slice(0, 8),
    [experiences]
  );

  const recentlyAdded = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return experiences.filter((e) => e.published_at && new Date(e.published_at).getTime() > cutoff).slice(0, 8);
  }, [experiences]);

  const byTopic = useMemo(() => {
    const map = new Map<string, ImmersiveExperience[]>();
    for (const e of experiences) {
      const k = (e.category || "").trim();
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [experiences]);

  const byScripture = useMemo(() => {
    const map = new Map<string, ImmersiveExperience[]>();
    for (const e of experiences) {
      const k = (e.primary_scripture || "").trim();
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [experiences]);

  const currentBg = current?.homepage_artwork_url || current?.artwork_url;
  const currentExp = current?.featured_experience;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Hero */}
      {current ? (
        <section className="relative overflow-hidden border-b border-border/40">
          {currentBg && (
            <img src={currentBg} alt="" aria-hidden loading="eager" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/20" />
          <div className="relative container mx-auto px-4 py-14 md:py-20 max-w-6xl">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary mb-3">
              <Sparkles className="h-4 w-4" /> Now Playing
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-3">{current.homepage_headline || current.title}</h1>
            {(current.homepage_description || current.description) && (
              <p className="text-foreground/85 max-w-2xl mb-6 leading-relaxed">
                {current.homepage_description || current.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {currentExp && (
                <Button asChild size="lg" className="shadow-gold">
                  <Link to={`/experiences/${currentExp.slug}`}>
                    <PlayCircle className="h-5 w-5 mr-2" /> {current.primary_watch_label || "Watch Now"}
                  </Link>
                </Button>
              )}
              <Button asChild size="lg" variant="outline">
                <Link to={`/series/${current.slug}`}>{current.secondary_watch_label || "Explore Series"}</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="border-b border-border/40 bg-gradient-to-br from-primary/10 to-transparent">
          <div className="container mx-auto px-4 py-14 max-w-6xl">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary mb-3">
              <Film className="h-4 w-4" /> Watch
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-2">Immersive Church, On Demand</h1>
            <p className="text-muted-foreground max-w-2xl">Cinematic teachings, series, and premieres — all in one place.</p>
          </div>
        </section>
      )}

      <div className="container mx-auto px-4 max-w-6xl py-10 space-y-12">
        {continueWatching.length > 0 && (
          <Row title="Continue Watching" icon={Bookmark} action={<Link to="/my/experiences" className="text-sm text-primary hover:underline">My Library</Link>}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {continueWatching.map((p) => (
                <ExperienceCard key={p.id} e={p.experience as ImmersiveExperience} badge="Resume" />
              ))}
            </div>
          </Row>
        )}

        {upcoming && (
          <Row title="Upcoming Premiere" icon={CalendarDays}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ExperienceCard e={upcoming} badge={new Date(upcoming.premiere_at!).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} />
            </div>
          </Row>
        )}

        {latest.length > 0 && (
          <Row title="Latest Experiences" icon={Sparkles}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {latest.map((e) => <ExperienceCard key={e.id} e={e} />)}
            </div>
          </Row>
        )}

        {popular.length > 0 && (
          <Row title="Popular Experiences" icon={Flame}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {popular.map((e) => <ExperienceCard key={e.id} e={e} />)}
            </div>
          </Row>
        )}

        {seriesList.length > 0 && (
          <Row title="Browse by Series" icon={Layers}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {seriesList.map((s) => (
                <Link key={s.id} to={`/series/${s.slug}`} className="group rounded-lg overflow-hidden bg-card border border-border/40 hover:border-primary/60 transition-all">
                  <div className="aspect-video bg-muted overflow-hidden">
                    {s.artwork_url ? (
                      <img src={s.artwork_url} alt={s.title} loading="lazy" className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform" />
                    ) : <div className="h-full w-full bg-gradient-to-br from-primary/30 to-background" />}
                  </div>
                  <div className="p-3">
                    <h3 className="font-display text-sm font-semibold group-hover:text-primary transition-colors line-clamp-1">{s.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </Row>
        )}

        {byTopic.length > 0 && (
          <Row title="Browse by Topic" icon={Tag}>
            <div className="flex flex-wrap gap-2">
              {byTopic.map(([topic, list]) => (
                <span key={topic} className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full bg-card border border-border/40">
                  {topic}
                  <span className="text-xs text-muted-foreground">{list.length}</span>
                </span>
              ))}
            </div>
          </Row>
        )}

        {byScripture.length > 0 && (
          <Row title="Browse by Scripture" icon={BookOpen}>
            <div className="flex flex-wrap gap-2">
              {byScripture.map(([ref, list]) => (
                <span key={ref} className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full bg-card border border-border/40">
                  {ref}
                  <span className="text-xs text-muted-foreground">{list.length}</span>
                </span>
              ))}
            </div>
          </Row>
        )}

        {recentlyAdded.length > 0 && (
          <Row title="Recently Added" icon={Clock}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {recentlyAdded.map((e) => <ExperienceCard key={e.id} e={e} />)}
            </div>
          </Row>
        )}

        {experiences.length === 0 && (
          <Card className="p-10 text-center text-muted-foreground">
            No experiences published yet — check back soon.
          </Card>
        )}
      </div>
    </div>
  );
}
