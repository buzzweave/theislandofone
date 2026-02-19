import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Save,
  Trash2,
  Star,
  DollarSign,
  BookOpen,
  Image,
  Upload,
  Loader2,
  ArrowLeft,
  Crown,
} from "lucide-react";
import { useBooks, useAddBook, useUpdateBook, useDeleteBook, type Book, type BookChapterInput } from "@/hooks/useBooks";
import SortableChapterList from "@/components/admin/SortableChapterList";
import { useAIContent } from "@/contexts/AIContentContext";
import AudioGenerator from "@/components/admin/AudioGenerator";
import PdfUploadButton from "@/components/admin/PdfUploadButton";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

const CATEGORIES = ["Devotional", "Faith", "Leadership", "Ministry", "Prayer", "Family"];

type LocalBook = Omit<Book, "created_at" | "updated_at">;

export default function AdminBookEditor() {
  const { data: bookList = [], isLoading } = useBooks();
  const addBookMut = useAddBook();
  const updateBookMut = useUpdateBook();
  const deleteBookMut = useDeleteBook();
  // Chapters are saved as part of the book body via VPS
  const isMobile = useIsMobile();
  const aiContent = useAIContent();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [local, setLocal] = useState<LocalBook | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!activeId && bookList.length > 0) {
      setActiveId(bookList[0].id);
    }
  }, [bookList]);

  useEffect(() => {
    if (activeId) {
      const book = bookList.find((b) => b.id === activeId);
      if (book) {
        setLocal({ ...book });
      }
    } else {
      setLocal(null);
    }
  }, [activeId, bookList]);

  useEffect(() => {
    if (!local) {
      aiContent.unregister();
      return;
    }
    aiContent.register({
      onInsert: (text) => {
        setLocal((prev) => {
          if (!prev) return prev;
          if (activeChapterId) {
            return {
              ...prev,
              chapters: prev.chapters.map((ch) =>
                ch.id === activeChapterId ? { ...ch, content: ch.content + "\n\n" + text } : ch
              ),
            };
          }
          return { ...prev, description: prev.description + "\n\n" + text };
        });
      },
      onReplace: (text) => {
        setLocal((prev) => {
          if (!prev) return prev;
          if (activeChapterId) {
            return {
              ...prev,
              chapters: prev.chapters.map((ch) =>
                ch.id === activeChapterId ? { ...ch, content: text } : ch
              ),
            };
          }
          return { ...prev, description: text };
        });
      },
    });
    return () => aiContent.unregister();
  }, [local?.id, activeChapterId, aiContent]);

  const updateLocal = (fields: Partial<LocalBook>) => {
    setLocal((prev) => (prev ? { ...prev, ...fields } : prev));
    setDirty(true);
  };

  const addNew = async () => {
    try {
      const result = await addBookMut.mutateAsync({
        title: "Untitled Book",
        subtitle: "",
        author: "Bryant Clark",
        description: "",
        price: 0,
        is_free: 1,
        category: "Faith",
        cover_image: "",
        featured: 0,
        audio_url: null,
        pdf_url: "",
        sort_order: 0,
        access_tiers: [],
        chapters: [],
      });
      setActiveId(result.id);
    } catch (err: any) {
      toast({ title: "Error creating book", description: err.message, variant: "destructive" });
    }
  };

  const deleteBook = async (id: string) => {
    if (!confirm("Delete this book?")) return;
    try {
      await deleteBookMut.mutateAsync(id);
      if (activeId === id) setActiveId(bookList.find((b) => b.id !== id)?.id ?? null);
      toast({ title: "Book deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const addChapter = () => {
    if (!local) return;
    const newChapter: BookChapterInput = {
      id: crypto.randomUUID(),
      book_id: local.id,
      title: `Chapter ${local.chapters.length + 1}`,
      content: "",
      sort_order: local.chapters.length,
    };
    updateLocal({ chapters: [...local.chapters, newChapter] });
  };

  const updateChapter = (chapterId: string, fields: Partial<BookChapterInput>) => {
    if (!local) return;
    updateLocal({
      chapters: local.chapters.map((ch) =>
        ch.id === chapterId ? { ...ch, ...fields } : ch
      ),
    });
  };

  const deleteChapter = (chapterId: string) => {
    if (!local) return;
    updateLocal({ chapters: local.chapters.filter((ch) => ch.id !== chapterId) });
  };

  const handleSave = async (isAuto = false) => {
    if (!local || saving || savingRef.current) return;
    setSaving(true);
    savingRef.current = true;

    try {
      await updateBookMut.mutateAsync({ id: local.id, ...local, is_free: local.is_free ? 1 : 0, featured: local.featured ? 1 : 0 });

      setDirty(false);
      setLastSavedAt(new Date());
      if (!isAuto) {
        toast({ title: "Book & chapters saved successfully!" });
      }
    } catch (err: any) {
      console.error("Save error:", err);
      const msg = err.message || "Unknown error";
      if (msg.includes("session") || msg.includes("log in") || msg.includes("expired")) {
        toast({ title: "Session expired", description: "Please log out and log back in, then try saving again.", variant: "destructive" });
      } else {
        toast({ title: isAuto ? "Auto-save failed" : "Save failed", description: msg, variant: "destructive" });
      }
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (dirty && local && !savingRef.current) {
        handleSave(true);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [dirty, local]);

  const showList = isMobile ? !activeId : true;
  const showEditor = isMobile ? !!activeId : true;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground animate-pulse">Loading books…</p>;
  }

  return (
    <div className={`flex ${isMobile ? "flex-col" : ""} gap-4 md:gap-6 h-[calc(100vh-8rem)]`}>
      {showList && (
        <div className={`${isMobile ? "w-full" : "w-64 shrink-0"} flex flex-col border border-border rounded-lg bg-card overflow-hidden ${isMobile ? "h-[calc(100vh-8rem)]" : ""}`}>
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">Books</span>
            <Button size="icon" variant="ghost" onClick={addNew} title="New book" disabled={addBookMut.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {bookList.map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveId(b.id)}
                className={`w-full text-left px-3 py-2.5 text-sm border-b border-border transition-colors ${
                  b.id === activeId
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  {b.featured && <Star className="h-3 w-3 text-primary shrink-0" />}
                  <span className="truncate font-medium">{b.title}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{b.category}</span>
                  <span className="text-[10px] text-muted-foreground">{b.chapters.length} ch.</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {showEditor && local ? (
        <div className="flex-1 overflow-y-auto space-y-6 pr-0 md:pr-2">
          {isMobile && (
            <Button variant="ghost" size="sm" onClick={() => setActiveId(null)} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
            </Button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Title</Label>
              <Input
                value={local.title}
                onChange={(e) => updateLocal({ title: e.target.value })}
                className="text-lg font-display"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Subtitle</Label>
              <Input
                value={local.subtitle}
                onChange={(e) => updateLocal({ subtitle: e.target.value })}
              />
            </div>
            <div>
              <Label>Author</Label>
              <Input
                value={local.author}
                onChange={(e) => updateLocal({ author: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={local.category} onValueChange={(v) => updateLocal({ category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Image className="h-4 w-4" /> Cover Image
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Label>Cover Image URL</Label>
                  <Input
                    value={local.cover_image}
                    onChange={(e) => updateLocal({ cover_image: e.target.value })}
                    placeholder="Upload an image or paste a URL"
                  />
                </div>
                <div className="flex items-end">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploading(true);
                      try {
                        const data = await api.upload<{ url: string }>("/api/upload", file);
                        updateLocal({ cover_image: data.url });
                        toast({ title: "Cover uploaded" });
                      } catch (err: any) {
                        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
                      } finally {
                        setUploading(false);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                    {uploading ? "Uploading…" : "Upload"}
                  </Button>
                </div>
              </div>
              {local.cover_image && (
                <div className="w-32 aspect-[2/3] rounded-lg border border-border overflow-hidden bg-muted">
                  <img src={local.cover_image} alt="Cover preview" className="w-full h-full object-cover" />
                </div>
              )}
            </CardContent>
          </Card>

          <div>
            <Label className="mb-1.5 block">Description</Label>
            <RichTextEditor
              content={local.description}
              onChange={(html) => updateLocal({ description: html })}
              placeholder="Write book description..."
              minHeight="120px"
            />
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Chapters ({local.chapters.length})
                </span>
                <div className="flex items-center gap-2">
                  <PdfUploadButton
                    mode="book"
                    onBookParsed={(data) => {
                      const newChapters = data.chapters.map((ch, i) => ({
                        id: crypto.randomUUID(),
                        book_id: local.id,
                        title: ch.title,
                        content: ch.content,
                        sort_order: local.chapters.length + i,
                      }));
                      updateLocal({
                        title: data.title || local.title,
                        subtitle: data.subtitle || local.subtitle,
                        chapters: [...local.chapters, ...newChapters],
                      });
                    }}
                  />
                  <Button size="sm" variant="outline" onClick={addChapter}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SortableChapterList
                chapters={local.chapters}
                onReorder={(reordered) => updateLocal({ chapters: reordered })}
                onUpdateChapter={updateChapter}
                onDeleteChapter={deleteChapter}
                onExpandedChange={(id) => setActiveChapterId(id)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> PDF Attachment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Upload a PDF file readers can download from the book page.</p>
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="flex-1">
                  <Input
                    value={local.pdf_url}
                    onChange={(e) => updateLocal({ pdf_url: e.target.value })}
                    placeholder="Upload a PDF or paste a URL"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingPdf(true);
                      try {
                        const data = await api.upload<{ url: string }>("/api/upload", file);
                        updateLocal({ pdf_url: data.url });
                        toast({ title: "PDF uploaded" });
                      } catch (err: any) {
                        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
                      } finally {
                        setUploadingPdf(false);
                        if (pdfInputRef.current) pdfInputRef.current.value = "";
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={uploadingPdf}
                  >
                    {uploadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                    {uploadingPdf ? "Uploading…" : "Upload PDF"}
                  </Button>
                  {local.pdf_url && (
                    <Button variant="ghost" size="sm" onClick={() => updateLocal({ pdf_url: "" })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {local.pdf_url && (
                <a href={local.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">
                  {local.pdf_url}
                </a>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Audio Version</CardTitle>
            </CardHeader>
            <CardContent>
              <AudioGenerator
                getText={() => local.chapters.map(ch => `${ch.title}\n\n${ch.content}`).join("\n\n")}
                getTitle={() => local.title}
                audioUrl={local.audio_url ?? undefined}
                onAudioGenerated={(url) => updateLocal({ audio_url: url })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Publishing Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Feature on Front Page</p>
                  <p className="text-xs text-muted-foreground">Show this book in the featured section.</p>
                </div>
                <Switch
                  checked={!!local.featured}
                  onCheckedChange={(v) => updateLocal({ featured: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" /> Charge for This Book
                  </p>
                  <p className="text-xs text-muted-foreground">Toggle to set a price or make it free.</p>
                </div>
                <Switch
                  checked={!local.is_free}
                  onCheckedChange={(v) =>
                    updateLocal({ is_free: !v, price: v ? local.price || 14.99 : 0 })
                  }
                />
              </div>
              {!local.is_free && (
                <div className="pl-4 border-l-2 border-primary/20">
                  <Label>Price ($)</Label>
                  <Input
                    type="number"
                    min={0.99}
                    step={0.01}
                    value={local.price}
                    onChange={(e) => updateLocal({ price: parseFloat(e.target.value) || 0 })}
                    className="w-32"
                  />
                </div>
              )}

              <div>
                <p className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <Crown className="h-3.5 w-3.5" /> Membership Access
                </p>
                <p className="text-xs text-muted-foreground mb-3">Select which membership tiers can access this book for free.</p>
                <div className="flex flex-wrap gap-3">
                  {(["reader", "pastor", "inner-circle"] as const).map((tier) => {
                    const tiers = (local as any).access_tiers || [];
                    const checked = tiers.includes(tier);
                    return (
                      <label key={tier} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = checked ? tiers.filter((t: string) => t !== tier) : [...tiers, tier];
                            updateLocal({ access_tiers: next } as any);
                          }}
                          className="accent-primary h-4 w-4"
                        />
                        <span className="capitalize">{tier === "inner-circle" ? "Inner Circle" : tier.charAt(0).toUpperCase() + tier.slice(1)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-3 pb-8">
            <Button onClick={() => handleSave(false)} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving…" : "Save Book"}
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => deleteBook(local.id)}
              title="Delete book"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        !isMobile && !local && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Select a book or create a new one.</p>
          </div>
        )
      )}
    </div>
  );
}
