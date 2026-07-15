import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Loader2, Edit, Trash2, Layers, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useExperienceSeriesList,
  useCreateSeries,
  useUpdateSeries,
  useDeleteSeries,
  type ExperienceSeries,
} from "@/hooks/useExperienceSeries";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80)
    || `series-${Date.now().toString(36)}`;
}

const emptyForm: Partial<ExperienceSeries> = {
  title: "", slug: "", description: "", artwork_url: "", trailer_url: "",
  order_index: 0, status: "draft",
};

export default function AdminSeries() {
  const { data: seriesList = [], isLoading } = useExperienceSeriesList();
  const createMut = useCreateSeries();
  const updateMut = useUpdateSeries();
  const deleteMut = useDeleteSeries();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExperienceSeries | null>(null);
  const [form, setForm] = useState<Partial<ExperienceSeries>>(emptyForm);

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (s: ExperienceSeries) => { setEditing(s); setForm(s); setOpen(true); };

  const save = async () => {
    try {
      const payload = {
        ...form,
        title: form.title?.trim() || "Untitled Series",
        slug: form.slug?.trim() || slugify(form.title || "series"),
      };
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, ...payload });
        toast.success("Series updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Series created");
      }
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
  };

  const remove = async (s: ExperienceSeries) => {
    if (!window.confirm(`Delete series "${s.title}"? Experiences in this series will be unlinked.`)) return;
    try {
      await deleteMut.mutateAsync(s.id);
      toast.success("Deleted");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" /> Experience Series
          </h2>
          <p className="text-sm text-muted-foreground">
            Group immersive experiences into collections. Public discovery at <code>/experiences</code>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/experiences"><ExternalLink className="h-4 w-4 mr-1" /> Experiences</Link>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Series</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Series" : "New Series"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Title</label>
                  <Input
                    value={form.title ?? ""}
                    onChange={(e) => setForm((f) => ({
                      ...f,
                      title: e.target.value,
                      slug: (!editing && (!f.slug || f.slug === slugify(f.title ?? "")))
                        ? slugify(e.target.value)
                        : f.slug,
                    }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Slug</label>
                  <Input value={form.slug ?? ""} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Description</label>
                  <Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Artwork URL</label>
                    <Input value={form.artwork_url ?? ""} onChange={(e) => setForm((f) => ({ ...f, artwork_url: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Trailer URL</label>
                    <Input value={form.trailer_url ?? ""} onChange={(e) => setForm((f) => ({ ...f, trailer_url: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Order</label>
                    <Input type="number" value={form.order_index ?? 0} onChange={(e) => setForm((f) => ({ ...f, order_index: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Status</label>
                    <Select value={form.status ?? "draft"} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={createMut.isPending || updateMut.isPending}>
                  {(createMut.isPending || updateMut.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  {editing ? "Save" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : seriesList.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <Layers className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-medium mb-1">No series yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create a series to group related immersive experiences.</p>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Series</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {seriesList.map((s) => (
            <Card key={s.id} className="overflow-hidden flex flex-col">
              <div className="aspect-video bg-muted relative">
                {s.artwork_url ? (
                  <img src={s.artwork_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Layers className="h-8 w-8" />
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <Badge variant={s.status === "published" ? "default" : "secondary"} className="capitalize">
                    {s.status}
                  </Badge>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold truncate">{s.title}</h3>
                <p className="text-xs text-muted-foreground truncate mb-2">/{s.slug}</p>
                {s.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{s.description}</p>}
                <div className="mt-auto flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                    <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  {s.status === "published" && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/experiences/series/${s.slug}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(s)} disabled={deleteMut.isPending}>
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
