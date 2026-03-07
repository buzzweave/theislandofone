import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, GripVertical, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Chapter {
  id: string;
  title: string;
  content: string;
  sort_order: number;
}

export default function StudioProject() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { org } = useWorkspace();
  const navigate = useNavigate();

  const [projectTitle, setProjectTitle] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!org || !id) return;
    loadProject();
    loadChapters();
  }, [org, id]);

  const loadProject = async () => {
    const { data } = await supabase.from("workspace_projects").select("title").eq("id", id!).single();
    if (data) setProjectTitle((data as any).title);
  };

  const loadChapters = async () => {
    if (!org) return;
    const { data } = await supabase.from("workspace_chapters").select("*").eq("project_id", id!).eq("org_id", org.id).order("sort_order");
    if (data) {
      setChapters(data as Chapter[]);
      if (data.length > 0 && !activeChapter) setActiveChapter(data[0].id);
    }
  };

  const addChapter = async () => {
    if (!org) return;
    const order = chapters.length;
    const { data } = await supabase.from("workspace_chapters").insert({
      project_id: id!,
      org_id: org.id,
      title: `Chapter ${order + 1}`,
      content: "",
      sort_order: order,
    }).select().single();
    if (data) {
      const ch = data as Chapter;
      setChapters((prev) => [...prev, ch]);
      setActiveChapter(ch.id);
    }
  };

  const deleteChapter = async (chId: string) => {
    await supabase.from("workspace_chapters").delete().eq("id", chId);
    setChapters((prev) => prev.filter((c) => c.id !== chId));
    if (activeChapter === chId) setActiveChapter(chapters[0]?.id || null);
  };

  const updateChapter = (chId: string, field: "title" | "content", value: string) => {
    setChapters((prev) => prev.map((c) => c.id === chId ? { ...c, [field]: value } : c));
  };

  const saveAll = async () => {
    setSaving(true);
    // Save project title
    await supabase.from("workspace_projects").update({ title: projectTitle }).eq("id", id!);
    // Save all chapters
    for (const ch of chapters) {
      await supabase.from("workspace_chapters").update({ title: ch.title, content: ch.content, sort_order: ch.sort_order }).eq("id", ch.id);
    }
    setSaving(false);
    toast({ title: "Saved!" });
  };

  const current = chapters.find((c) => c.id === activeChapter);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border bg-card px-4 h-12 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/studio/dashboard" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Input
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="border-0 bg-transparent font-semibold text-lg h-8 p-0 focus-visible:ring-0"
          />
        </div>
        <Button size="sm" onClick={saveAll} disabled={saving} className="bg-primary text-primary-foreground">
          <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save"}
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Chapter sidebar */}
        <aside className="w-52 border-r border-border bg-card overflow-y-auto hidden md:block p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Chapters</span>
            <button onClick={addChapter} className="text-primary hover:text-primary/80">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1">
            {chapters.map((ch) => (
              <div
                key={ch.id}
                className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-sm cursor-pointer transition-colors ${
                  activeChapter === ch.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => setActiveChapter(ch.id)}
              >
                <span className="truncate">{ch.title || "Untitled"}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteChapter(ch.id); }} className="opacity-0 group-hover:opacity-100 hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Writing area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          {current ? (
            <div className="max-w-3xl mx-auto">
              <Input
                value={current.title}
                onChange={(e) => updateChapter(current.id, "title", e.target.value)}
                className="text-2xl font-bold border-0 bg-transparent p-0 h-auto mb-6 focus-visible:ring-0"
                placeholder="Chapter title"
              />
              <Textarea
                value={current.content}
                onChange={(e) => updateChapter(current.id, "content", e.target.value)}
                className="min-h-[60vh] border-0 bg-transparent p-0 resize-none text-base leading-relaxed focus-visible:ring-0"
                placeholder="Start writing…"
              />
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-20">
              <p>Add a chapter to start writing.</p>
              <Button onClick={addChapter} className="mt-4 bg-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-1" /> Add Chapter
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
