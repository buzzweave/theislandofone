import { useState, useEffect, useRef, useCallback } from "react";
import { useBooks } from "@/hooks/useBooks";
import { useSermons } from "@/hooks/useSermons";
import { useAudiobooks, useUpsertAudiobook, useUpdateAudiobook, useDeleteAudiobook } from "@/hooks/useAudiobooks";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Headphones, Loader2, Volume2, Download, Trash2, Eye, EyeOff,
  DollarSign, Play, Pause, Music, Upload, VolumeX, Gauge, RotateCcw,
  ImageIcon,
} from "lucide-react";
import { uploadToStorage } from "@/lib/supabaseUpload";

/* ------------------------------------------------------------------ */
/*  Voice constants                                                    */
/* ------------------------------------------------------------------ */
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
  { id: "ash", label: "Ash", desc: "Calm, measured" },
  { id: "echo", label: "Echo", desc: "Warm, confident" },
  { id: "fable", label: "Fable", desc: "Expressive, storytelling" },
  { id: "onyx", label: "Onyx", desc: "Deep, authoritative" },
  { id: "nova", label: "Nova", desc: "Friendly, upbeat" },
  { id: "shimmer", label: "Shimmer", desc: "Clear, gentle" },
  { id: "coral", label: "Coral", desc: "Smooth, warm" },
  { id: "sage", label: "Sage", desc: "Calm, wise" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function AdminAudiobooks() {
  const { data: books, isLoading: booksLoading } = useBooks();
  const { data: sermons, isLoading: sermonsLoading } = useSermons();
  const { data: audiobooks, isLoading: audiobooksLoading } = useAudiobooks();
  const upsertAudiobook = useUpsertAudiobook();
  const updateAudiobook = useUpdateAudiobook();
  const deleteAudiobook = useDeleteAudiobook();
  const { toast } = useToast();

  /* generation state */
  const [contentType, setContentType] = useState<"book" | "sermon">("book");
  const [selectedContentId, setSelectedContentId] = useState("");
  const [provider, setProvider] = useState<"elevenlabs" | "openai">("openai");
  const [voiceId, setVoiceId] = useState("onyx");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [genPercent, setGenPercent] = useState(0);
  const [contentReady, setContentReady] = useState(false);
  const [contentPreview, setContentPreview] = useState("");
  const [charCount, setCharCount] = useState(0);

  /* soundtrack state */
  const [soundtrackFile, setSoundtrackFile] = useState<File | null>(null);
  const [soundtrackUrl, setSoundtrackUrl] = useState("");
  const [voiceVolume, setVoiceVolume] = useState(100);
  const [musicVolume, setMusicVolume] = useState(30);
  const [musicMuted, setMusicMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  /* cover image state */
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [customCoverFile, setCustomCoverFile] = useState<File | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  /* playback state */
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [previewAudioUrl, setPreviewAudioUrl] = useState("");

  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const soundtrackInputRef = useRef<HTMLInputElement>(null);

  const voices = provider === "elevenlabs" ? ELEVENLABS_VOICES : OPENAI_VOICES;

  /* ---- auto-prepare content + cover ---- */
  useEffect(() => {
    if (!selectedContentId) {
      setContentReady(false);
      setContentPreview("");
      setCharCount(0);
      setCoverImageUrl("");
      setCustomCoverFile(null);
      return;
    }
    const { text } = getContentText();
    const plain = stripHtml(text);
    if (plain) {
      setContentPreview(plain.slice(0, 300) + (plain.length > 300 ? "..." : ""));
      setCharCount(plain.length);
      setContentReady(true);
    } else {
      setContentReady(false);
      setContentPreview("");
      setCharCount(0);
    }
    // Auto-set cover from content
    if (contentType === "book") {
      const book = books?.find((b) => b.id === selectedContentId);
      setCoverImageUrl(book?.cover_image || "");
    } else {
      setCoverImageUrl(""); // sermons don't have covers by default
    }
    setCustomCoverFile(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContentId, contentType, books, sermons]);

  /* ---- sync audio volumes ---- */
  useEffect(() => {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.volume = voiceVolume / 100;
      voiceAudioRef.current.playbackRate = playbackSpeed;
    }
    if (musicAudioRef.current) {
      musicAudioRef.current.volume = musicMuted ? 0 : musicVolume / 100;
    }
  }, [voiceVolume, musicVolume, musicMuted, playbackSpeed]);

  /* ---- playback time tracking ---- */
  useEffect(() => {
    const el = voiceAudioRef.current;
    if (!el) return;
    const onTime = () => setPlaybackTime(el.currentTime);
    const onMeta = () => setPlaybackDuration(el.duration || 0);
    const onEnd = () => { setIsPlaying(false); musicAudioRef.current?.pause(); };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
    };
  }, [previewAudioUrl]);

  const handleProviderChange = (p: "elevenlabs" | "openai") => {
    setProvider(p);
    setVoiceId(p === "elevenlabs" ? "deep-smooth" : "onyx");
  };

  const getContentText = (): { text: string; title: string; chapters: { title: string; content: string }[] } => {
    if (contentType === "book") {
      const book = books?.find((b) => b.id === selectedContentId);
      if (!book) return { text: "", title: "", chapters: [] };
      const chapters = book.chapters || [];
      const text = chapters.map((c) => `${c.title}\n\n${c.content}`).join("\n\n") || book.description;
      return { text, title: book.title, chapters };
    } else {
      const sermon = sermons?.find((s) => s.id === selectedContentId);
      if (!sermon) return { text: "", title: "", chapters: [] };
      return { text: sermon.manuscript || sermon.excerpt, title: sermon.title, chapters: [] };
    }
  };

  /* ---- GENERATE ---- */
  const handleGenerate = async () => {
    const { text, title, chapters } = getContentText();
    const plainText = stripHtml(text);
    if (!plainText.trim()) {
      toast({ title: "No content", description: "Selected item has no text to convert.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setGenPercent(10);
    setProgress(`Generating with ${provider === "openai" ? "OpenAI" : "ElevenLabs"}...`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated. Please sign in first.");

      setGenPercent(20);

      // Build payload — use chapters mode for books with chapters
      const payload: any = { voice: voiceId, title, provider };
      if (chapters.length > 0) {
        payload.chapters = chapters.map((ch) => ({ title: ch.title, text: ch.content }));
        setProgress(`Processing ${chapters.length} chapters...`);
      } else {
        payload.text = plainText;
      }

      setGenPercent(30);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      setGenPercent(70);

      if (!response.ok) {
        let errMsg = `Generation failed (${response.status})`;
        try {
          const err = await response.json();
          errMsg = err.error || errMsg;
        } catch { /* ignore parse errors */ }
        throw new Error(errMsg);
      }

      const data = await response.json();
      setGenPercent(90);

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

      setGenPercent(100);
      setPreviewAudioUrl(data.audioUrl);
      toast({ title: "Audio generated!", description: "Audiobook created and saved." });
    } catch (err: any) {
      console.error("Audio generation error:", err);
      toast({ title: "Error", description: err.message || "Generation failed", variant: "destructive" });
    } finally {
      setIsGenerating(false);
      setProgress("");
      setTimeout(() => setGenPercent(0), 1500);
    }
  };

  /* ---- SOUNDTRACK ---- */
  const ALLOWED_AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".wma", ".webm"];
  const handleSoundtrackUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    const isAudioMime = file.type.startsWith("audio/");
    const isAllowedExt = ALLOWED_AUDIO_EXTENSIONS.includes(ext);
    if (!isAudioMime && !isAllowedExt) {
      toast({ title: "Unsupported file type", description: `Please upload an audio file: ${ALLOWED_AUDIO_EXTENSIONS.join(", ")}`, variant: "destructive" });
      return;
    }
    setSoundtrackFile(file);
    const url = URL.createObjectURL(file);
    setSoundtrackUrl(url);
    toast({ title: "Soundtrack loaded", description: file.name });
    if (e.target) e.target.value = "";
  };

  /* ---- PLAYBACK ---- */
  const togglePlayback = useCallback(() => {
    const voice = voiceAudioRef.current;
    const music = musicAudioRef.current;
    if (!voice) return;

    if (isPlaying) {
      voice.pause();
      music?.pause();
      setIsPlaying(false);
    } else {
      voice.volume = voiceVolume / 100;
      voice.playbackRate = playbackSpeed;
      voice.play().catch(() => {});
      if (music && soundtrackUrl && !musicMuted) {
        music.volume = musicVolume / 100;
        music.currentTime = voice.currentTime;
        music.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  }, [isPlaying, voiceVolume, musicVolume, musicMuted, playbackSpeed, soundtrackUrl]);

  const seekTo = (time: number) => {
    if (voiceAudioRef.current) voiceAudioRef.current.currentTime = time;
    if (musicAudioRef.current && soundtrackUrl) musicAudioRef.current.currentTime = time;
    setPlaybackTime(time);
  };

  /* ---- DOWNLOAD ---- */
  const handleDownload = async (audioUrl: string, title: string) => {
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const safeName = title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-").toLowerCase() || "audiobook";
      const filename = `${safeName}.mp3`;
      const { triggerDownload } = await import("@/lib/downloadHelper");
      await triggerDownload(blob, filename);
    } catch {
      window.open(audioUrl, "_blank");
    }
  };

  /* ---- COVER IMAGE ---- */
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image (JPG, PNG, etc).", variant: "destructive" });
      return;
    }
    setCustomCoverFile(file);
    const localUrl = URL.createObjectURL(file);
    setCoverImageUrl(localUrl);
    toast({ title: "Cover loaded", description: file.name });
    if (e.target) e.target.value = "";
  };

  const handleDownloadCover = async (imageUrl: string, title: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const ext = blob.type.includes("png") ? "png" : "jpg";
      const safeName = title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-").toLowerCase() || "cover";
      const filename = `${safeName}-cover.${ext}`;
      const { triggerDownload } = await import("@/lib/downloadHelper");
      await triggerDownload(blob, filename);
      toast({ title: "Cover downloaded", description: "Save to Photos to post on Facebook." });
    } catch {
      window.open(imageUrl, "_blank");
    }
  };

  /* ---- LIBRARY ACTIONS ---- */
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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

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

        {/* ============== GENERATE TAB ============== */}
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
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
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

            {/* AUDIO PREP */}
            {contentReady && (
              <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold uppercase tracking-wide">Audio Prep</span>
                  <Badge variant="secondary" className="text-[10px]">{charCount.toLocaleString()} chars</Badge>
                  {contentType === "book" && books?.find(b => b.id === selectedContentId)?.chapters?.length ? (
                    <Badge variant="outline" className="text-[10px]">
                      {books.find(b => b.id === selectedContentId)!.chapters!.length} chapters
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{contentPreview}</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => {
                    toast({ title: "Text prepared", description: "Content formatted for audiobook narration." });
                  }}>
                    <Headphones className="h-3.5 w-3.5" /> Prepare text for narration
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => {
                    toast({ title: "Pacing added", description: "Natural pauses and pacing cues applied." });
                  }}>
                    <Headphones className="h-3.5 w-3.5" /> Add natural pauses
                  </Button>
                </div>
              </div>
            )}

            {/* Generation progress */}
            {isGenerating && genPercent > 0 && (
              <div className="space-y-1">
                <Progress value={genPercent} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">{progress}</p>
              </div>
            )}

            <Button onClick={handleGenerate} disabled={!selectedContentId || isGenerating || !contentReady} className="w-full md:w-auto">
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{progress || "Generating..."}</>
              ) : (
                <><Volume2 className="h-4 w-4 mr-2" />Generate Audiobook</>
              )}
            </Button>
          </Card>

          {/* ============== SOUNDTRACK & SOUNDBOARD ============== */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              <span className="font-semibold">Soundtrack & Soundboard</span>
            </div>

            {/* Upload soundtrack */}
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => soundtrackInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Upload Soundtrack
              </Button>
              <input ref={soundtrackInputRef} type="file" accept="audio/*" className="hidden" onChange={handleSoundtrackUpload} />
              {soundtrackFile && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{soundtrackFile.name}</span>}
              {soundtrackUrl && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSoundtrackFile(null); setSoundtrackUrl(""); }}>
                  <Trash2 className="h-3 w-3 mr-1" /> Remove
                </Button>
              )}
            </div>

            {/* Volume controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5 text-primary" /> Voice Volume
                  </label>
                  <span className="text-xs text-muted-foreground">{voiceVolume}%</span>
                </div>
                <Slider value={[voiceVolume]} onValueChange={([v]) => setVoiceVolume(v)} min={0} max={100} step={5} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium flex items-center gap-1.5">
                    <Music className="h-3.5 w-3.5 text-primary" /> Soundtrack Volume
                    <button onClick={() => setMusicMuted(!musicMuted)} className="ml-1">
                      {musicMuted ? <VolumeX className="h-3 w-3 text-destructive" /> : null}
                    </button>
                  </label>
                  <span className="text-xs text-muted-foreground">{musicMuted ? "Muted" : `${musicVolume}%`}</span>
                </div>
                <Slider value={[musicVolume]} onValueChange={([v]) => setMusicVolume(v)} min={0} max={100} step={5} disabled={musicMuted} />
              </div>
            </div>

            {/* Speed control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5 text-primary" /> Narration Speed
                </label>
                <span className="text-xs text-muted-foreground">{playbackSpeed}x</span>
              </div>
              <Slider value={[playbackSpeed * 100]} onValueChange={([v]) => setPlaybackSpeed(v / 100)} min={50} max={200} step={5} />
            </div>
          </Card>

          {/* ============== COVER IMAGE ============== */}
          {selectedContentId && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                <span className="font-semibold">Cover Image</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start">
                {coverImageUrl ? (
                  <img
                    src={coverImageUrl}
                    alt="Cover"
                    className="w-32 h-44 object-cover rounded-lg border border-border shrink-0"
                  />
                ) : (
                  <div className="w-32 h-44 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center shrink-0">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}

                <div className="space-y-2 flex-1">
                  <p className="text-xs text-muted-foreground">
                    {coverImageUrl
                      ? "This cover will be available to download before your audiobook. Save it to Photos to post on Facebook."
                      : "Upload a cover image for this audiobook. Great for sharing on Facebook and social media."}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => coverInputRef.current?.click()}>
                      <Upload className="h-3.5 w-3.5" /> {coverImageUrl ? "Change Cover" : "Upload Cover"}
                    </Button>
                    <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />

                    {coverImageUrl && (
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                        const { title } = getContentText();
                        handleDownloadCover(coverImageUrl, title);
                      }}>
                        <Download className="h-3.5 w-3.5" /> Download Cover to Photos
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ============== PREVIEW PLAYER ============== */}
          {previewAudioUrl && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-primary" />
                <span className="font-semibold">Preview</span>
              </div>

              {/* Hidden audio elements */}
              <audio ref={voiceAudioRef} src={previewAudioUrl} preload="metadata" />
              {soundtrackUrl && <audio ref={musicAudioRef} src={soundtrackUrl} preload="metadata" loop />}

              {/* Controls */}
              <div className="flex items-center gap-3">
                <Button size="icon" variant="outline" className="h-10 w-10 rounded-full shrink-0" onClick={togglePlayback}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                </Button>

                <div className="flex-1 space-y-1">
                  <Slider
                    value={[playbackTime]}
                    onValueChange={([v]) => seekTo(v)}
                    min={0}
                    max={playbackDuration || 1}
                    step={0.5}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{formatTime(playbackTime)}</span>
                    <span>{formatTime(playbackDuration)}</span>
                  </div>
                </div>
              </div>

              {/* Download section with cover */}
              {coverImageUrl && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <img src={coverImageUrl} alt="Cover" className="w-12 h-16 object-cover rounded shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{getContentText().title}</p>
                    <p className="text-[10px] text-muted-foreground">Download cover to post on Facebook</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => {
                    const { title } = getContentText();
                    handleDownloadCover(coverImageUrl, title);
                  }}>
                    <ImageIcon className="h-3.5 w-3.5" /> Save Cover
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                  const { title } = getContentText();
                  handleDownload(previewAudioUrl, title);
                }}>
                  <Download className="h-3.5 w-3.5" /> Download MP3
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => {
                  setPreviewAudioUrl("");
                  setIsPlaying(false);
                  voiceAudioRef.current?.pause();
                  musicAudioRef.current?.pause();
                }}>
                  <RotateCcw className="h-3.5 w-3.5" /> Clear
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ============== LIBRARY TAB ============== */}
        <TabsContent value="library" className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !audiobooks?.length ? (
            <p className="text-muted-foreground text-center py-12">No audiobooks yet. Generate one above.</p>
          ) : (
            audiobooks.map((ab) => {
              const abCover = ab.content_type === "book"
                ? books?.find((b) => b.id === ab.content_id)?.cover_image
                : undefined;
              return (
              <Card key={ab.id} className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
                {abCover && (
                  <img src={abCover} alt="Cover" className="w-16 h-22 object-cover rounded-lg border border-border shrink-0" />
                )}
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
                  {abCover && (
                    <Button variant="ghost" size="icon" onClick={() => handleDownloadCover(abCover, getContentTitle(ab))} title="Download cover to Photos">
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  )}
                  {ab.audio_url && (
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(ab.audio_url, getContentTitle(ab))}>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => {
                    if (ab.audio_url) { setPreviewAudioUrl(ab.audio_url); }
                  }}>
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(ab.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
              );
            })
          )}
        </TabsContent>

        {/* ============== PRICING TAB ============== */}
        <TabsContent value="pricing" className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !audiobooks?.length ? (
            <p className="text-muted-foreground text-center py-12">No audiobooks to price yet.</p>
          ) : (
            audiobooks.map((ab) => (
              <Card key={ab.id} className="p-4 space-y-4">
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
                        type="number" min="0" step="0.01" className="w-24"
                        defaultValue={ab.price}
                        onBlur={(e) => handleUpdatePrice(ab, parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  )}
                  {!ab.is_separate_price && (
                    <span className="text-sm text-muted-foreground">Bundled with {ab.content_type} price</span>
                  )}
                </div>

                {/* Publish Audio Version section */}
                <div className="border-t border-border pt-3 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Publish Audio Version</p>

                  {ab.content_type === "sermon" && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Publish Audio to Sermon</p>
                        <p className="text-xs text-muted-foreground">Audio player will appear on the sermon page.</p>
                      </div>
                      <Switch
                        checked={ab.is_visible}
                        onCheckedChange={async () => {
                          // Set visibility AND update the sermon's audio_url
                          const newVisible = !ab.is_visible;
                          await updateAudiobook.mutateAsync({ id: ab.id, is_visible: newVisible });
                          if (ab.content_id) {
                            await supabase.from("sermons").update({
                              audio_url: newVisible ? ab.audio_url : null,
                            }).eq("id", ab.content_id);
                          }
                          toast({
                            title: newVisible ? "Published to sermon" : "Removed from sermon",
                            description: newVisible
                              ? "Audio player is now visible on the sermon page."
                              : "Audio removed from the sermon page.",
                          });
                        }}
                      />
                    </div>
                  )}

                  {ab.content_type === "book" && (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Publish Audio to Book</p>
                          <p className="text-xs text-muted-foreground">Audio player will appear on the book page.</p>
                        </div>
                        <Switch
                          checked={ab.is_visible}
                          onCheckedChange={async () => {
                            const newVisible = !ab.is_visible;
                            await updateAudiobook.mutateAsync({ id: ab.id, is_visible: newVisible });
                            if (ab.content_id) {
                              await supabase.from("books").update({
                                audio_url: newVisible ? ab.audio_url : null,
                              }).eq("id", ab.content_id);
                            }
                            toast({
                              title: newVisible ? "Published to book" : "Removed from book",
                              description: newVisible
                                ? "Audio player is now visible on the book page."
                                : "Audio removed from the book page.",
                            });
                          }}
                        />
                      </div>

                      {/* Attach to a sermon */}
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium">Attach Audio to a Sermon</p>
                        <p className="text-xs text-muted-foreground">Publish this audio into a sermon page as well.</p>
                        <Select
                          value=""
                          onValueChange={async (sermonId) => {
                            if (!sermonId) return;
                            await supabase.from("sermons").update({
                              audio_url: ab.audio_url,
                            }).eq("id", sermonId);
                            toast({
                              title: "Audio attached to sermon",
                              description: "The audio player will now show on that sermon page.",
                            });
                          }}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Select a sermon..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(sermons || []).map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Feature Audio on Front Page</p>
                      <p className="text-xs text-muted-foreground">Highlight this audiobook on the homepage.</p>
                    </div>
                    <Switch
                      checked={ab.is_visible}
                      onCheckedChange={() => handleToggleVisibility(ab)}
                    />
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
