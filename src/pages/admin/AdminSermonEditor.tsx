import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Plus,
  Save,
  Eye,
  Trash2,
  Star,
  DollarSign,
  Lock,
  BookOpen,
  ArrowLeft,
  Crown,
} from "lucide-react";
import { useSermons, useAddSermon, useUpdateSermon, useDeleteSermon, type Sermon } from "@/hooks/useSermons";
import { useAIContent } from "@/contexts/AIContentContext";
import AudioGenerator from "@/components/admin/AudioGenerator";
import RichTextEditor from "@/components/admin/RichTextEditor";
import PdfUploadButton from "@/components/admin/PdfUploadButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

export default function AdminSermonEditor() {
  const { data: sermonList = [], isLoading } = useSermons();
  const addSermon = useAddSermon();
  const updateSermon = useUpdateSermon();
  const deleteSermonMut = useDeleteSermon();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Sermon>>({});
  const [dirty, setDirty] = useState(false);
  const aiContent = useAIContent();
  const isMobile = useIsMobile();

  // Set initial active ID when data loads
  useEffect(() => {
    if (!activeId && sermonList.length > 0 && !isMobile) {
      setActiveId(sermonList[0].id);
    }
  }, [sermonList, activeId, isMobile]);

  // Sync draft when activeId changes
  const prevActiveId = useRef<string | null>(null);

  useEffect(() => {
    const active = sermonList.find((s) => s.id === activeId);
    if (!active) return;

    if (activeId !== prevActiveId.current || !dirty) {
      setDraft(active);
      setDirty(false);
      prevActiveId.current = activeId;
    }
  }, [activeId, sermonList]);

  const update = useCallback((fields: Partial<Sermon>) => {
    setDraft((prev) => ({ ...prev, ...fields }));
    setDirty(true);
  }, []);

  useEffect(() => {
    if (!draft.id) {
      aiContent.unregister();
      return;
    }
    aiContent.register({
      onInsert: (text) => {
        update({ manuscript: (draft.manuscript || "") + "\n\n" + text });
      },
      onReplace: (text) => {
        update({ manuscript: text });
      },
    });
    return () => aiContent.unregister();
  }, [draft.id, draft.manuscript, aiContent, update]);

  const addNew = async () => {
    try {
      const result = await addSermon.mutateAsync({
        title: "Untitled Sermon",
        scripture: "",
        excerpt: "",
        manuscript: "",
        access_level: "free",
        date: new Date().toISOString().slice(0, 10),
        category: "Faith",
        price: 0,
        is_free: 1,
        preview_cutoff: 2,
        featured: 0,
        audio_url: "",
        sort_order: 0,
        access_tiers: "",
      });
      setActiveId(result.id);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create sermon");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSermonMut.mutateAsync(id);
      if (activeId === id) {
        setActiveId(sermonList.find((s) => s.id !== id)?.id ?? null);
      }
      toast.success("Sermon deleted");
    } catch {
      toast.error("Failed to delete sermon");
    }
  };

  const handleSave = async () => {
    if (!draft.id) return;
    try {
      await updateSermon.mutateAsync({
        id: draft.id,
        title: draft.title,
        scripture: draft.scripture,
        excerpt: draft.excerpt,
        manuscript: draft.manuscript,
        access_level: draft.access_level,
        date: draft.date,
        category: draft.category,
        price: draft.price,
        is_free: draft.is_free ? 1 : 0,
        preview_cutoff: draft.preview_cutoff,
        featured: draft.featured ? 1 : 0,
        audio_url: draft.audio_url || "",
        access_tiers: Array.isArray(draft.access_tiers) ? draft.access_tiers.join(",") : (draft.access_tiers || ""),
      });
      setDirty(false);
      toast.success("Sermon saved!");
    } catch {
      toast.error("Failed to save sermon");
    }
  };

  const paragraphs = (draft.manuscript || "").split("\n\n").filter(Boolean);

  const showList = isMobile ? !activeId : true;
  const showEditor = isMobile ? !!activeId : true;

  if (isLoading) {
    return <p className="text-center text-muted-foreground animate-pulse py-12">Loading sermons…</p>;
  }

  return (
    <div className={`flex ${isMobile ? "flex-col" : ""} gap-4 md:gap-6 h-[calc(100vh-8rem)]`}>
      {/* Sermon List */}
      {showList && (
        <div className={`${isMobile ? "w-full" : "w-64 shrink-0"} flex flex-col border border-border rounded-lg bg-card overflow-hidden ${isMobile ? "h-[calc(100vh-8rem)]" : ""}`}>
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">Sermons</span>
            <Button size="icon" variant="ghost" onClick={addNew} title="New sermon" disabled={addSermon.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sermonList.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`w-full text-left px-3 py-2.5 text-sm border-b border-border transition-colors ${
                  s.id === activeId
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  {s.featured && <Star className="h-3 w-3 text-primary shrink-0" />}
                  <span className="truncate font-medium">{s.title}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{s.category}</span>
                  {!s.is_free && <Lock className="h-2.5 w-2.5 text-muted-foreground" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Editor */}
      {showEditor && draft.id ? (
        <div className="flex-1 overflow-y-auto space-y-6 pr-0 md:pr-2">
          {isMobile && (
            <Button variant="ghost" size="sm" onClick={() => setActiveId(null)} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
            </Button>
          )}

          {/* Title & meta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Title</Label>
              <Input
                value={draft.title || ""}
                onChange={(e) => update({ title: e.target.value })}
                className="text-lg font-display"
              />
            </div>
            <div>
              <Label>Scripture</Label>
              <Input
                value={draft.scripture || ""}
                onChange={(e) => update({ scripture: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={draft.category || "Faith"} onValueChange={(v) => update({ category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Faith", "Worship", "Calling", "Leadership", "Deliverance", "Prayer", "Family"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={draft.date || ""}
                onChange={(e) => update({ date: e.target.value })}
              />
            </div>
            <div>
              <Label>Access Level</Label>
              <Select
                value={draft.access_level || "free"}
                onValueChange={(v) => update({ access_level: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="pastor">Pastor Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <Label>Excerpt / Summary</Label>
            <Textarea
              value={draft.excerpt || ""}
              onChange={(e) => update({ excerpt: e.target.value })}
              rows={2}
            />
          </div>

          {/* Manuscript */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Manuscript
              </Label>
              <PdfUploadButton
                mode="sermon"
                onSermonParsed={(data) => {
                  update({
                    title: data.title || draft.title,
                    scripture: data.scripture || draft.scripture,
                    excerpt: data.excerpt || draft.excerpt,
                    manuscript: data.manuscript,
                  });
                }}
              />
            </div>
            <RichTextEditor
              content={draft.manuscript || ""}
              onChange={(html) => update({ manuscript: html })}
              placeholder="Write your sermon manuscript here..."
              minHeight="250px"
            />
          </div>

          {/* Publishing controls */}
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
                  <p className="text-xs text-muted-foreground">Show this sermon in the featured section.</p>
                </div>
                <Switch
                  checked={!!draft.featured}
                  onCheckedChange={(v) => update({ featured: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" /> Charge for This Sermon
                  </p>
                  <p className="text-xs text-muted-foreground">Toggle to set a price or make it free.</p>
                </div>
                <Switch
                  checked={!draft.is_free}
                  onCheckedChange={(v) =>
                    update({ is_free: !v, price: v ? (draft.price || 4.99) : 0 })
                  }
                />
              </div>

              {!draft.is_free && (
                <div className="pl-4 border-l-2 border-primary/20">
                  <Label>Price ($)</Label>
                  <Input
                    type="number"
                    min={0.99}
                    step={0.01}
                    value={draft.price || 0}
                    onChange={(e) => update({ price: parseFloat(e.target.value) || 0 })}
                    className="w-32"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" /> Preview Cutoff
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Paragraphs shown before paywall ({paragraphs.length} total).
                    </p>
                  </div>
                  <span className="text-sm font-mono text-primary">
                    {(draft.preview_cutoff || 0) + 1} / {paragraphs.length}
                  </span>
                </div>
                <Slider
                  min={1}
                  max={Math.max(paragraphs.length, 1)}
                  step={1}
                  value={[(draft.preview_cutoff || 0) + 1]}
                  onValueChange={([v]) => update({ preview_cutoff: v - 1 })}
                />
              </div>

              <div>
                <p className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <Crown className="h-3.5 w-3.5" /> Membership Access
                </p>
                <p className="text-xs text-muted-foreground mb-3">Select which membership tiers can access this sermon for free.</p>
                <div className="flex flex-wrap gap-3">
                  {(["reader", "pastor", "inner-circle"] as const).map((tier) => {
                    const tiers = Array.isArray(draft.access_tiers) ? draft.access_tiers : (draft.access_tiers ? String(draft.access_tiers).split(",").filter(Boolean) : []);
                    const checked = tiers.includes(tier);
                    return (
                      <label key={tier} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = checked ? tiers.filter((t) => t !== tier) : [...tiers, tier];
                            update({ access_tiers: next } as any);
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

          {/* Audio */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Audio Version</CardTitle>
            </CardHeader>
            <CardContent>
              <AudioGenerator
                getText={() => draft.manuscript || ""}
                getTitle={() => draft.title || ""}
                audioUrl={draft.audio_url}
                onAudioGenerated={(url) => update({ audio_url: url })}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pb-8">
            <Button onClick={handleSave} disabled={updateSermon.isPending || !dirty}>
              <Save className="h-4 w-4 mr-2" />
              {updateSermon.isPending ? "Saving…" : dirty ? "Save Sermon" : "Saved"}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`/sermons/${draft.id}`, "_blank")}
            >
              <Eye className="h-4 w-4 mr-2" /> Preview
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => draft.id && handleDelete(draft.id)}
              disabled={deleteSermonMut.isPending}
              title="Delete sermon"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        !isMobile && !draft.id && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Select a sermon or create a new one.</p>
          </div>
        )
      )}
    </div>
  );
}
