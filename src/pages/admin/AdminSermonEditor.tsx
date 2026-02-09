import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { type Sermon } from "@/data/content";
import { useSermons } from "@/hooks/useSermons";
import { useAIContent } from "@/contexts/AIContentContext";

export default function AdminSermonEditor() {
  const { sermons: sermonList, setSermons: setSermonList } = useSermons();
  const [activeId, setActiveId] = useState<string | null>(sermonList[0]?.id ?? null);
  const [saved, setSaved] = useState(false);
  const aiContent = useAIContent();

  const active = sermonList.find((s) => s.id === activeId) ?? null;

  const updateManuscript = useCallback((fields: Partial<Sermon>) => {
    if (!activeId) return;
    setSermonList((prev) =>
      prev.map((s) => (s.id === activeId ? { ...s, ...fields } : s)),
    );
    setSaved(false);
  }, [activeId, setSermonList]);

  useEffect(() => {
    if (!active) {
      aiContent.unregister();
      return;
    }
    aiContent.register({
      onInsert: (text) => {
        setSermonList((prev) =>
          prev.map((s) =>
            s.id === activeId
              ? { ...s, manuscript: s.manuscript + "\n\n" + text }
              : s
          )
        );
        setSaved(false);
      },
      onReplace: (text) => {
        setSermonList((prev) =>
          prev.map((s) =>
            s.id === activeId ? { ...s, manuscript: text } : s
          )
        );
        setSaved(false);
      },
    });
    return () => aiContent.unregister();
  }, [activeId, active, aiContent, setSermonList]);


  const update = (fields: Partial<Sermon>) => {
    updateManuscript(fields);
  };

  const addNew = () => {
    const newSermon: Sermon = {
      id: crypto.randomUUID(),
      title: "Untitled Sermon",
      scripture: "",
      excerpt: "",
      manuscript: "",
      accessLevel: "free",
      date: new Date().toISOString().slice(0, 10),
      category: "Faith",
      price: 0,
      isFree: true,
      previewCutoff: 2,
      featured: false,
    };
    setSermonList((prev) => [newSermon, ...prev]);
    setActiveId(newSermon.id);
    setSaved(false);
  };

  const deleteSermon = (id: string) => {
    setSermonList((prev) => prev.filter((s) => s.id !== id));
    if (activeId === id) setActiveId(sermonList.find((s) => s.id !== id)?.id ?? null);
  };

  const handleSave = () => {
    // In production this would persist to DB
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const paragraphs = active?.manuscript.split("\n\n").filter(Boolean) ?? [];

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Sermon list */}
      <div className="w-64 shrink-0 flex flex-col border border-border rounded-lg bg-card overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold">Sermons</span>
          <Button size="icon" variant="ghost" onClick={addNew} title="New sermon">
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
                {!s.isFree && <Lock className="h-2.5 w-2.5 text-muted-foreground" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      {active ? (
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Title & meta */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Title</Label>
              <Input
                value={active.title}
                onChange={(e) => update({ title: e.target.value })}
                className="text-lg font-display"
              />
            </div>
            <div>
              <Label>Scripture</Label>
              <Input
                value={active.scripture}
                onChange={(e) => update({ scripture: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={active.category} onValueChange={(v) => update({ category: v })}>
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
                value={active.date}
                onChange={(e) => update({ date: e.target.value })}
              />
            </div>
            <div>
              <Label>Access Level</Label>
              <Select
                value={active.accessLevel}
                onValueChange={(v: "free" | "member" | "pastor") => update({ accessLevel: v })}
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
              value={active.excerpt}
              onChange={(e) => update({ excerpt: e.target.value })}
              rows={2}
            />
          </div>

          {/* Manuscript */}
          <div>
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Manuscript
            </Label>
            <Textarea
              value={active.manuscript}
              onChange={(e) => update({ manuscript: e.target.value })}
              rows={14}
              className="font-body text-sm leading-relaxed"
              placeholder="Write your sermon manuscript here. Separate paragraphs with blank lines."
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
              {/* Featured toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Feature on Front Page</p>
                  <p className="text-xs text-muted-foreground">Show this sermon in the featured section on the homepage.</p>
                </div>
                <Switch
                  checked={active.featured}
                  onCheckedChange={(v) => update({ featured: v })}
                />
              </div>

              {/* Pricing toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" /> Charge for This Sermon
                  </p>
                  <p className="text-xs text-muted-foreground">Toggle to set a price or make it free.</p>
                </div>
                <Switch
                  checked={!active.isFree}
                  onCheckedChange={(v) =>
                    update({ isFree: !v, price: v ? (active.price || 4.99) : 0 })
                  }
                />
              </div>

              {/* Price input */}
              {!active.isFree && (
                <div className="pl-4 border-l-2 border-primary/20">
                  <Label>Price ($)</Label>
                  <Input
                    type="number"
                    min={0.99}
                    step={0.01}
                    value={active.price}
                    onChange={(e) => update({ price: parseFloat(e.target.value) || 0 })}
                    className="w-32"
                  />
                </div>
              )}

              {/* Preview cutoff */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" /> Preview Cutoff
                    </p>
                    <p className="text-xs text-muted-foreground">
                      How many paragraphs shown before the paywall ({paragraphs.length} total).
                    </p>
                  </div>
                  <span className="text-sm font-mono text-primary">
                    {active.previewCutoff + 1} / {paragraphs.length}
                  </span>
                </div>
                <Slider
                  min={1}
                  max={Math.max(paragraphs.length, 1)}
                  step={1}
                  value={[active.previewCutoff + 1]}
                  onValueChange={([v]) => update({ previewCutoff: v - 1 })}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>Minimal preview</span>
                  <span>Full access</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3 pb-8">
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {saved ? "Saved!" : "Save Sermon"}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`/sermons/${active.id}`, "_blank")}
            >
              <Eye className="h-4 w-4 mr-2" /> Preview Live
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => deleteSermon(active.id)}
              title="Delete sermon"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p>Select a sermon or create a new one.</p>
        </div>
      )}
    </div>
  );
}
