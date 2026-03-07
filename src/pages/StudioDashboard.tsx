import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Layers, PenLine, Library, GraduationCap, CheckCircle, Settings, LogOut, Plus, Trash2, Edit } from "lucide-react";
import studioLogo from "@/assets/studio-logo.jpeg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
}

interface Material {
  id: string;
  title: string;
  content: string;
  category: string;
}

type Tab = "projects" | "notes" | "materials" | "branding";

export default function StudioDashboard() {
  const { user, signOut } = useAuth();
  const { org, branding, isLoading, refreshWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("projects");

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [showNewNote, setShowNewNote] = useState(false);

  // Materials state
  const [materials, setMaterials] = useState<Material[]>([]);
  const [newMatTitle, setNewMatTitle] = useState("");
  const [newMatContent, setNewMatContent] = useState("");
  const [showNewMat, setShowNewMat] = useState(false);

  // Branding state
  const [studioName, setStudioName] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [publisherName, setPublisherName] = useState("");

  useEffect(() => {
    if (!isLoading && !user) navigate("/studio/auth");
  }, [isLoading, user]);

  useEffect(() => {
    if (!org) return;
    loadProjects();
    loadNotes();
    loadMaterials();
    if (branding) {
      setStudioName(branding.studio_name);
      setAuthorName(branding.author_name);
      setPublisherName(branding.publisher_name);
    }
  }, [org, branding]);

  const loadProjects = async () => {
    if (!org) return;
    const { data } = await supabase.from("workspace_projects").select("*").eq("org_id", org.id).order("sort_order");
    if (data) setProjects(data as Project[]);
  };

  const loadNotes = async () => {
    if (!org) return;
    const { data } = await supabase.from("workspace_notes").select("*").eq("org_id", org.id).order("created_at", { ascending: false });
    if (data) setNotes(data as Note[]);
  };

  const loadMaterials = async () => {
    if (!org) return;
    const { data } = await supabase.from("workspace_materials").select("*").eq("org_id", org.id).order("sort_order");
    if (data) setMaterials(data as Material[]);
  };

  const addProject = async () => {
    if (!org || !newTitle.trim()) return;
    await supabase.from("workspace_projects").insert({ org_id: org.id, title: newTitle, description: newDesc });
    setNewTitle(""); setNewDesc(""); setShowNewProject(false);
    loadProjects();
    toast({ title: "Project created" });
  };

  const deleteProject = async (id: string) => {
    await supabase.from("workspace_projects").delete().eq("id", id);
    loadProjects();
  };

  const addNote = async () => {
    if (!org || !newNoteTitle.trim()) return;
    await supabase.from("workspace_notes").insert({ org_id: org.id, title: newNoteTitle, content: newNoteContent });
    setNewNoteTitle(""); setNewNoteContent(""); setShowNewNote(false);
    loadNotes();
    toast({ title: "Note saved" });
  };

  const deleteNote = async (id: string) => {
    await supabase.from("workspace_notes").delete().eq("id", id);
    loadNotes();
  };

  const addMaterial = async () => {
    if (!org || !newMatTitle.trim()) return;
    await supabase.from("workspace_materials").insert({ org_id: org.id, title: newMatTitle, content: newMatContent });
    setNewMatTitle(""); setNewMatContent(""); setShowNewMat(false);
    loadMaterials();
    toast({ title: "Material created" });
  };

  const deleteMaterial = async (id: string) => {
    await supabase.from("workspace_materials").delete().eq("id", id);
    loadMaterials();
  };

  const saveBranding = async () => {
    if (!org) return;
    await supabase.from("workspace_branding").update({ studio_name: studioName, author_name: authorName, publisher_name: publisherName }).eq("org_id", org.id);
    refreshWorkspace();
    toast({ title: "Branding saved" });
  };

  const displayName = branding?.studio_name || org?.name || "Island of One Studio";

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center px-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">No workspace found</h2>
          <p className="text-muted-foreground mb-6">Subscribe to create your writing studio.</p>
          <Link to="/studio">
            <Button className="bg-primary text-primary-foreground">Get Started</Button>
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "projects" as Tab, label: "Book Projects", icon: BookOpen },
    { key: "notes" as Tab, label: "Research Notes", icon: Library },
    { key: "materials" as Tab, label: "Teaching & Training", icon: GraduationCap },
    { key: "branding" as Tab, label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={studioLogo} alt="Island of One" className="h-8 w-8 rounded-full object-cover" />
          <span className="font-bold text-primary">{displayName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/studio"); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 border-r border-border bg-card min-h-[calc(100vh-3.5rem)] p-4 hidden md:block">
          <nav className="space-y-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  tab === t.key ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile tabs */}
        <div className="md:hidden border-b border-border bg-card px-2 py-2 flex gap-1 overflow-x-auto w-full fixed top-14 z-40">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${
                tab === t.key ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              <t.icon className="h-3 w-3" /> {t.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <main className="flex-1 p-6 md:p-8 mt-12 md:mt-0">
          {/* Projects tab */}
          {tab === "projects" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Book Projects</h2>
                <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> New Project</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>New Book Project</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <Input placeholder="Book title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                      <Textarea placeholder="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
                      <Button onClick={addProject} className="w-full bg-primary text-primary-foreground">Create Project</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {projects.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No book projects yet. Create your first one!</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {projects.map((p) => (
                    <div key={p.id} className="bg-card border border-border rounded-xl p-5 flex items-start justify-between">
                      <div>
                        <Link to={`/studio/project/${p.id}`} className="text-lg font-semibold hover:text-primary transition-colors">{p.title}</Link>
                        {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                        <span className="text-xs text-muted-foreground mt-2 inline-block capitalize">{p.status}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteProject(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes tab */}
          {tab === "notes" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Research Notes</h2>
                <Dialog open={showNewNote} onOpenChange={setShowNewNote}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> New Note</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>New Research Note</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <Input placeholder="Title" value={newNoteTitle} onChange={(e) => setNewNoteTitle(e.target.value)} />
                      <Textarea placeholder="Content" value={newNoteContent} onChange={(e) => setNewNoteContent(e.target.value)} rows={6} />
                      <Button onClick={addNote} className="w-full bg-primary text-primary-foreground">Save Note</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {notes.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Library className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No research notes yet.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {notes.map((n) => (
                    <div key={n.id} className="bg-card border border-border rounded-xl p-5 flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{n.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{n.content}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteNote(n.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Materials tab */}
          {tab === "materials" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Teaching & Training Materials</h2>
                <Dialog open={showNewMat} onOpenChange={setShowNewMat}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> New Material</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>New Teaching Material</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <Input placeholder="Title" value={newMatTitle} onChange={(e) => setNewMatTitle(e.target.value)} />
                      <Textarea placeholder="Content" value={newMatContent} onChange={(e) => setNewMatContent(e.target.value)} rows={6} />
                      <Button onClick={addMaterial} className="w-full bg-primary text-primary-foreground">Create Material</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {materials.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No teaching materials yet.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {materials.map((m) => (
                    <div key={m.id} className="bg-card border border-border rounded-xl p-5 flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{m.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.content}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteMaterial(m.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Branding tab */}
          {tab === "branding" && (
            <div className="max-w-lg">
              <h2 className="text-2xl font-bold mb-6">Studio Branding</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Studio Name</label>
                  <Input value={studioName} onChange={(e) => setStudioName(e.target.value)} placeholder="My Writing Studio" />
                </div>
                <div>
                  <label className="text-sm font-medium">Author Name</label>
                  <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Your name" />
                </div>
                <div>
                  <label className="text-sm font-medium">Publisher Name</label>
                  <Input value={publisherName} onChange={(e) => setPublisherName(e.target.value)} placeholder="Your publishing house" />
                </div>
                <Button onClick={saveBranding} className="bg-primary text-primary-foreground">Save Branding</Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
