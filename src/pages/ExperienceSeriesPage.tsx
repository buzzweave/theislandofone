import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSeriesBySlug } from "@/hooks/useExperienceSeries";
import { ArrowLeft, Layers, Loader2 } from "lucide-react";
import { ExperienceGrid } from "./ExperiencesDiscovery";
import type { ImmersiveExperience } from "@/hooks/useExperiences";

export default function ExperienceSeriesPage() {
  const { slug } = useParams();
  const { data: series, isLoading: sLoading } = useSeriesBySlug(slug);

  const { data: items = [], isLoading: iLoading } = useQuery({
    queryKey: ["immersive_experiences", "by_series", series?.id],
    enabled: !!series?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("immersive_experiences")
        .select("*")
        .eq("series_id", series!.id)
        .eq("status", "published")
        .in("visibility", ["public", "scheduled"])
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ImmersiveExperience[];
    },
  });

  if (sLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!series || series.status !== "published") {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-3 text-center px-4">
        <p className="text-muted-foreground">This series isn't available.</p>
        <Link to="/experiences" className="text-primary hover:underline">Back to Experiences</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border/40">
        {series.artwork_url && (
          <img
            src={series.artwork_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
            aria-hidden
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        <div className="container mx-auto px-4 py-14 relative">
          <Link to="/experiences" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> All Experiences
          </Link>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary mb-2">
            <Layers className="h-4 w-4" /> Series
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">{series.title}</h1>
          {series.description && (
            <p className="text-muted-foreground max-w-2xl">{series.description}</p>
          )}
        </div>
      </section>

      <div className="container mx-auto px-4 py-10">
        {iLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">No experiences in this series yet.</p>
        ) : (
          <ExperienceGrid items={items} />
        )}
      </div>
    </div>
  );
}
