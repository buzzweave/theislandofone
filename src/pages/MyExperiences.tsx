import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Bookmark, PlayCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSavedExperiences, useMyProgress } from "@/hooks/useSavedExperiences";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function MyExperiences() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const { data: saved = [], isLoading: sLoading } = useSavedExperiences();
  const { data: progress = [], isLoading: pLoading } = useMyProgress();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setAuthed(!!data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session?.user);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { document.title = "My Experiences · The Island of One"; }, []);

  if (authed === false) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6">
        <h1 className="font-display text-3xl">Your Experience Library</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Sign in to save experiences and pick up where you left off.
        </p>
        <Button onClick={() => navigate("/login")}>Sign in</Button>
      </div>
    );
  }

  const isLoading = authed === null || sLoading || pLoading;

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <header className="mb-8">
        <h1 className="font-display text-4xl md:text-5xl font-semibold">My Experiences</h1>
        <p className="text-muted-foreground mt-2">Your saved journeys and in-progress viewing.</p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="continue">
          <TabsList>
            <TabsTrigger value="continue">
              <PlayCircle className="h-4 w-4 mr-1" /> Continue ({progress.length})
            </TabsTrigger>
            <TabsTrigger value="saved">
              <Bookmark className="h-4 w-4 mr-1" /> Saved ({saved.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="continue" className="mt-6">
            {progress.length === 0 ? (
              <EmptyState message="You haven't started any experiences yet." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {progress.map((p: any) => (
                  p.experience ? (
                    <ExperienceCard
                      key={p.id}
                      slug={p.experience.slug}
                      title={p.experience.title}
                      subtitle={p.experience.subtitle}
                      cover={p.experience.cover_image}
                      badge={p.completed ? "Completed" : "In progress"}
                      completed={p.completed}
                    />
                  ) : null
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved" className="mt-6">
            {saved.length === 0 ? (
              <EmptyState message="No saved experiences yet. Tap the bookmark icon on any experience to save it here." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {saved.map((s) => (
                  s.experience ? (
                    <ExperienceCard
                      key={s.id}
                      slug={s.experience.slug}
                      title={s.experience.title}
                      subtitle={s.experience.subtitle}
                      cover={s.experience.cover_image}
                      badge="Saved"
                    />
                  ) : null
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="p-10 text-center text-muted-foreground">
      <p>{message}</p>
      <Button asChild variant="outline" className="mt-4">
        <Link to="/experiences">Browse experiences</Link>
      </Button>
    </Card>
  );
}

function ExperienceCard({
  slug, title, subtitle, cover, badge, completed,
}: {
  slug: string; title: string; subtitle: string | null; cover: string | null; badge?: string; completed?: boolean;
}) {
  return (
    <Link to={`/experiences/${slug}`} className="group block">
      <Card className="overflow-hidden bg-card border-border/40 hover:border-primary/60 transition-all">
        <div className="relative aspect-video bg-muted">
          {cover ? (
            <img src={cover} alt={title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/30 to-background" />
          )}
          {badge && (
            <span className="absolute top-2 right-2 text-xs px-2 py-1 rounded-full bg-black/60 text-white backdrop-blur inline-flex items-center gap-1">
              {completed && <CheckCircle2 className="h-3 w-3" />} {badge}
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-display text-lg font-semibold group-hover:text-primary transition-colors line-clamp-1">
            {title}
          </h3>
          {subtitle && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{subtitle}</p>}
        </div>
      </Card>
    </Link>
  );
}
