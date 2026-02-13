import { useState } from "react";
import { useBooks } from "@/hooks/useBooks";
import { useSermons } from "@/hooks/useSermons";
import { useAudiobooks, useUpsertAudiobook, useUpdateAudiobook, useDeleteAudiobook } from "@/hooks/useAudiobooks";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Headphones, Loader2, Volume2, Download, Trash2, Eye, EyeOff, DollarSign } from "lucide-react";

const ELEVENLABS_VOICES = [
  { id: "deep-smooth", label: "Deep & Smooth", desc: "Rich baritone" },
  { id: "warm-narrator", label: "Warm Narrator", desc: "Engaging male" },
  { id: "calm-male", label: "Calm & Collected", desc: "Measured male" },
  { id: "rich-female", label: "Rich Female", desc: "Warm female" },
  { id: "smooth-male", label: "Smooth Male", desc: "Silky male" },
  { id: "classic-narrator", label: "Classic Narrator", desc: "Traditional" },
  { id: "gentle-female", label: "Gentle Female", desc: "Soft female" },
];

const OPENAI_VOICES = [
  { id: "alloy", label: "Alloy", desc: "Neutral, balanced" },
  { id: "echo", label: "Echo", desc: "Warm, confident" },
  { id: "fable", label: "Fable", desc: "Expressive, storytelling" },
  { id: "onyx", label: "Onyx", desc: "Deep, authoritative" },
  { id: "nova", label: "Nova", desc: "Friendly, upbeat" },
  { id: "shimmer", label: "Shimmer", desc: "Clear, gentle" },
];

export default function AdminAudiobooks() {
  const { data: books, isLoading: booksLoading } = useBooks();
  const { data: sermons, isLoading: sermonsLoading } = useSermons();
  const { data: audiobooks, isLoading: audiobooksLoading } = useAudiobooks();
  const upsertAudiobook = useUpsertAudiobook();
  const updateAudiobook = useUpdateAudiobook();
  const deleteAudiobook = useDeleteAudiobook();
  const { toast } = useToast();

  const [contentType, setContentType] = useState<"book" | "sermon">("book");
  const [selectedContentId, setSelectedContentId] = useState("");
  const [provider, setProvider] = useState<"elevenlabs" | "openai">("elevenlabs");
  const [voiceId, setVoiceId] = useState("deep-smooth");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");

  const voices = provider === "elevenlabs" ? ELEVENLABS_VOICES : OPENAI_VOICES;

  // When switching provider, reset voice to first option
  const handleProviderChange = (p: "elevenlabs" | "openai") => {
    setProvider(p);
    setVoiceId(p === "elevenlabs" ? "deep-smooth" : "alloy");
  };

  const getContentText = (): { text: string; title: string } => {
    if (contentType === "book") {
      const book = books?.find((b) => b.id === selectedContentId);
      if (!book) return { text: "", title: "" };
      const chapterText = book.chapters?.map((c) => `${c.title}\n\n${c.content}`).join("\n\n") || "";
      return { text: chapterText || book.description, title: book.title };
    } else {
      const sermon = sermons?.find((s) => s.id === selectedContentId);
      if (!sermon) return { text: "", title: "" };
      return { text: sermon.manuscript || sermon.excerpt, title: sermon.title };
    }
  };

  const handleGenerate = async () => {
    const { text, title } = getContentText();
    if (!text.trim()) {
      toast({ title: "No content", description: "Selected item has no text to convert.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setProgress(`Generating with ${provider === "openai" ? "OpenAI" : "ElevenLabs"}...`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ text, voice: voiceId, title, provider }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Generation failed");
      }

      const data = await response.json();

      // Upsert the audiobook record
      await upsertAudiobook.mutateAsync({
        content_type: contentType,
        content_id: selectedContentId,
        audio_url: data.audioUrl,
        voice_provider: provider,
        voice_id: voiceId,
        price: 0,
        is_separate_price: false,
        is_visible: false,
        title,
      });

      setProgress("");
      toast({ title: "Audio generated!", description: "Audiobook created and saved." });
    } catch (err: any) {
      console.error("Audio generation error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
      setProgress("");
    }
  };

  const handleToggleVisibility = async (ab: any) => {
    await updateAudiobook.mutateAsync({ id: ab.id, is_visible: !ab.is_visible });
    toast({ title: ab.is_visible ? "Hidden" : "Visible", description: `Audio is now ${ab.is_visible ? "hidden" : "visible"} on the public page.` });
  };

  const handleUpdatePrice = async (ab: any, price: number) => {
    await updateAudiobook.mutateAsync({ id: ab.id, price });
  };

  const handleToggleSeparatePrice = async (ab: any) => {
    await updateAudiobook.mutateAsync({ id: ab.id, is_separate_price: !ab.is_separate_price });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this audiobook?")) return;
    await deleteAudiobook.mutateAsync(id);
    toast({ title: "Deleted", description: "Audiobook removed." });
  };

  const getContentTitle = (ab: any) => {
    if (ab.content_type === "book") return books?.find((b) => b.id === ab.content_id)?.title || ab.title;
    return sermons?.find((s) => s.id === ab.content_id)?.title || ab.title;
  };

  const contentOptions = contentType === "book"
    ? (books || []).map((b) => ({ id: b.id, label: b.title }))
    : (sermons || []).map((s) => ({ id: s.id, label: s.title }));

  const isLoading = booksLoading || sermonsLoading || audiobooksLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Headphones className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-display font-bold">Audiobooks</h1>
      </div>

      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">Generate Audio</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>

        {/* GENERATE TAB */}
        <TabsContent value="generate" className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Content type */}
              <div>
                <label className="text-sm font-medium mb-1 block">Content Type</label>
                <Select value={contentType} onValueChange={(v) => { setContentType(v as any); setSelectedContentId(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="book">Book</SelectItem>
                    <SelectItem value="sermon">Sermon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Content selection */}
              <div>
                <label className="text-sm font-medium mb-1 block">Select {contentType === "book" ? "Book" : "Sermon"}</label>
                <Select value={selectedContentId} onValueChange={setSelectedContentId}>
                  <SelectTrigger><SelectValue placeholder={`Choose a ${contentType}...`} /></SelectTrigger>
                  <SelectContent>
                    {contentOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Provider */}
              <div>
                <label className="text-sm font-medium mb-1 block">Voice Provider</label>
                <Select value={provider} onValueChange={(v) => handleProviderChange(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Voice */}
              <div>
                <label className="text-sm font-medium mb-1 block">Voice</label>
                <Select value={voiceId} onValueChange={setVoiceId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {voices.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        <span className="font-medium">{v.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{v.desc}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={!selectedContentId || isGenerating} className="w-full md:w-auto">
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{progress || "Generating..."}</>
              ) : (
                <><Volume2 className="h-4 w-4 mr-2" />Generate Audiobook</>
              )}
            </Button>
          </Card>
        </TabsContent>

        {/* LIBRARY TAB */}
        <TabsContent value="library" className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !audiobooks?.length ? (
            <p className="text-muted-foreground text-center py-12">No audiobooks yet. Generate one above.</p>
          ) : (
            audiobooks.map((ab) => (
              <Card key={ab.id} className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Headphones className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium truncate">{getContentTitle(ab)}</span>
                    <Badge variant="outline" className="text-xs shrink-0">{ab.content_type}</Badge>
                    <Badge variant="secondary" className="text-xs shrink-0">{ab.voice_provider}</Badge>
                  </div>
                  {ab.audio_url && (
                    <audio controls className="w-full h-9 mt-2" src={ab.audio_url}>
                      Your browser does not support audio.
                    </audio>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => handleToggleVisibility(ab)} title={ab.is_visible ? "Hide from public" : "Show on public"}>
                    {ab.is_visible ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  {ab.audio_url && (
                    <a href={ab.audio_url} download>
                      <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
                    </a>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(ab.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* PRICING TAB */}
        <TabsContent value="pricing" className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !audiobooks?.length ? (
            <p className="text-muted-foreground text-center py-12">No audiobooks to price yet.</p>
          ) : (
            audiobooks.map((ab) => (
              <Card key={ab.id} className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="font-medium">{getContentTitle(ab)}</span>
                  <Badge variant="outline" className="text-xs">{ab.content_type}</Badge>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-muted-foreground whitespace-nowrap">Sell separately</label>
                    <Switch checked={ab.is_separate_price} onCheckedChange={() => handleToggleSeparatePrice(ab)} />
                  </div>

                  {ab.is_separate_price && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-muted-foreground">Price $</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-24"
                        defaultValue={ab.price}
                        onBlur={(e) => handleUpdatePrice(ab, parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  )}

                  {!ab.is_separate_price && (
                    <span className="text-sm text-muted-foreground">Bundled with {ab.content_type} price</span>
                  )}
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
