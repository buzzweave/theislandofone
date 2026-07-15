import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Film, Copy, Trash2, Edit, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  useExperiences,
  useCreateExperience,
  useDuplicateExperience,
  useDeleteExperience,
} from "@/hooks/useExperiences";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80) || `experience-${Date.now().toString(36)}`;
}

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  published: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  archived: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function AdminExperiences() {
  const navigate = useNavigate();
  const { data: experiences = [], isLoading } = useExperiences();
  const createMut = useCreateExperience();
  const duplicateMut = useDuplicateExperience();
  const deleteMut = useDeleteExperience();

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return experiences.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return (
        e.title.toLowerCase().includes(s) ||
        e.slug.toLowerCase().includes(s) ||
        (e.speaker ?? "").toLowerCase().includes(s) ||
        (e.category ?? "").toLowerCase().includes(s)
      );
    });
  }, [experiences, q, statusFilter]);

  const handleCreate = async () => {
    const title = window.prompt("Title for the new immersive experience:", "New Immersive Experience");
    if (!title) return;
    try {
      const created = await createMut.mutateAsync({
        title,
        slug: slugify(title),
        status: "draft",
        visibility: "public",
      });
      toast.success("Experience created");
      navigate(`/admin/experiences/${created.id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to create");
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const copy = await duplicateMut.mutateAsync(id);
      toast.success("Duplicated");
      navigate(`/admin/experiences/${copy.id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to duplicate");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This removes all scenes and interactions.`)) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Immersive Experiences
          </h2>
          <p className="text-sm text-muted-foreground">
            Cinematic services, teachings, and interactive moments. Publish to <code>/experience/[slug]</code>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/experiences/series">Manage Series</Link>
          </Button>
          <Button onClick={handleCreate} disabled={createMut.isPending}>
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            New Experience
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, slug, speaker…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {["all", "draft", "scheduled", "published", "archived"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="capitalize"
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <Film className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-medium mb-1">No experiences yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first immersive experience — a cinematic, scene-based service or teaching.
          </p>
          <Button onClick={handleCreate} disabled={createMut.isPending}>
            <Plus className="h-4 w-4 mr-1" /> New Experience
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((e) => (
            <Card key={e.id} className="overflow-hidden flex flex-col">
              <div className="aspect-video bg-muted relative">
                {e.featured_image ? (
                  <img
                    src={e.featured_image}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Film className="h-8 w-8" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  <Badge variant="outline" className={statusColor[e.status] ?? ""}>
                    {e.status}
                  </Badge>
                  {e.members_only && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                      Members
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold truncate">{e.title}</h3>
                <p className="text-xs text-muted-foreground truncate mb-2">/{e.slug}</p>
                {e.short_description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{e.short_description}</p>
                )}
                <div className="mt-auto flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/admin/experiences/${e.id}`}>
                      <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                    </Link>
                  </Button>
                  {e.status === "published" && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/experiences/${e.slug}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDuplicate(e.id)}
                    disabled={duplicateMut.isPending}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(e.id, e.title)}
                    disabled={deleteMut.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
