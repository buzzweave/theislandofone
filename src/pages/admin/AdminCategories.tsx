import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save, BookOpen, FileText } from "lucide-react";
import { useCategories, useAddCategory, useUpdateCategory, useDeleteCategory, type ContentCategory } from "@/hooks/useCategories";
import { toast } from "@/hooks/use-toast";

function CategoryList({ type }: { type: "book" | "sermon" }) {
  const { data: categories = [], isLoading } = useCategories(type);
  const addMut = useAddCategory();
  const updateMut = useUpdateCategory();
  const deleteMut = useDeleteCategory();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [newName, setNewName] = useState("");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const slug = newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    try {
      await addMut.mutateAsync({ type, name: newName.trim(), slug });
      setNewName("");
      toast({ title: "Category added" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    const slug = editName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    try {
      await updateMut.mutateAsync({ id: editingId, name: editName.trim(), slug, description: editDesc });
      setEditingId(null);
      toast({ title: "Category updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      await deleteMut.mutateAsync(id);
      toast({ title: "Category deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={`New ${type} category name…`}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={addMut.isPending || !newName.trim()}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card">
            {editingId === cat.id ? (
              <>
                <div className="flex-1 space-y-2">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                  <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description (optional)" />
                </div>
                <Button size="sm" onClick={handleSaveEdit} disabled={updateMut.isPending}>
                  <Save className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <p className="text-sm font-medium">{cat.name}</p>
                  {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditDesc(cat.description); }}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(cat.id)} disabled={deleteMut.isPending}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </>
            )}
          </div>
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No categories yet.</p>
        )}
      </div>
    </div>
  );
}

export default function AdminCategories() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold mb-1">Categories</h2>
        <p className="text-sm text-muted-foreground">Manage categories for Books and Sermons.</p>
      </div>

      <Tabs defaultValue="book" className="max-w-2xl">
        <TabsList>
          <TabsTrigger value="book" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Book Categories
          </TabsTrigger>
          <TabsTrigger value="sermon" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Sermon Categories
          </TabsTrigger>
        </TabsList>
        <TabsContent value="book" className="mt-4">
          <CategoryList type="book" />
        </TabsContent>
        <TabsContent value="sermon" className="mt-4">
          <CategoryList type="sermon" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
