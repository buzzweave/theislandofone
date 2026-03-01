import { useState, useEffect, useMemo, useCallback } from "react";
import { useBooks } from "@/hooks/useBooks";
import { useSermons } from "@/hooks/useSermons";
import { useBlogPosts } from "@/hooks/useBlogPosts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Film, Mic, Wand2, Play, Download, Share2, Sparkles, Music,
  Zap, MonitorPlay, Smartphone, Square, Loader2, AlertCircle,
  RotateCcw, Volume2, BookOpen, FileText, PenLine, Youtube,
  Newspaper, Library, Upload, Plus, Trash2, Scissors, Brain, Palette,
  Headphones, SlidersHorizontal, Video
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import VideoRenderer from "@/components/admin/video-studio/VideoRenderer";
import NanoStudio from "@/components/admin/video-studio/NanoStudio";
import BackgroundMusicPanel, { type MusicSettings } from "@/components/admin/video-studio/BackgroundMusicPanel";
import NarrationTextToggle from "@/components/admin/video-studio/NarrationTextToggle";
import RenderControls from "@/components/admin/video-studio/RenderControls";
import { Link } from "react-router-dom";
import {
  processCinematicScript,
  autoMatchVoice,
  applyViralHookBoost,
  EXPORT_PRESETS,
  generateYouTubeMetadata,
  generateShortsFromSlides,
  type SceneSlide,
  type ExportPreset,
  type YouTubeMetadata,
  type ShortClip,
} from "@/lib/cinematicEngine";

/* ─── Voice configs ─── */
const OPENAI_VOICES = [
  { id: "alloy", label: "Alloy", desc: "Neutral, balanced, versatile" },
  { id: "ash", label: "Ash", desc: "Confident, warm male" },
  { id: "ballad", label: "Ballad", desc: "Smooth, melodic storyteller" },
  { id: "cedar", label: "Cedar", desc: "Grounded, calm male" },
  { id: "coral", label: "Coral", desc: "Conversational, friendly female" },
  { id: "echo", label: "Echo", desc: "Warm, smooth male" },
  { id: "fable", label: "Fable", desc: "Expressive, dynamic British" },
  { id: "marin", label: "Marin", desc: "Natural, flowing female" },
  { id: "nova", label: "Nova", desc: "Friendly, energetic female" },
  { id: "onyx", label: "Onyx", desc: "Deep, authoritative male" },
  { id: "sage", label: "Sage", desc: "Wise, measured narrator" },
  { id: "shimmer", label: "Shimmer", desc: "Clear, bright female" },
  { id: "verse", label: "Verse", desc: "Rich, poetic male" },
];

const ELEVENLABS_VOICES = [
  { id: "JBFqnCBsd6RMkjVDRZzb", label: "George", desc: "Warm, British" },
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah", desc: "Soft, clear" },
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel", desc: "Deep narrator" },
  { id: "pFZP5JQG7iQjIQuC4Bku", label: "Lily", desc: "Gentle, warm" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam", desc: "Cinematic" },
  { id: "nPczCjzI2devNBz1zQrb", label: "Brian", desc: "Smooth storyteller" },
];

const TONE_OPTIONS = [
  { id: "preaching", label: "🔥 Preaching", desc: "Bold, powerful delivery" },
  { id: "cinematic", label: "🎬 Cinematic Narration", desc: "Epic storytelling" },
  { id: "devotional", label: "🕊️ Soft Devotional", desc: "Calm, reflective" },
  { id: "documentary", label: "📽️ Documentary", desc: "Informative, measured" },
  { id: "gentle-female", label: "🌸 Gentle Woman", desc: "Soft, devotional warmth" },
];

const MUSIC_STYLES = [
  { id: "", label: "No Music" },
  { id: "cinematic-emotional", label: "🎬 Cinematic Emotional" },
  { id: "worship-instrumental", label: "🙏 Worship Instrumental" },
  { id: "documentary-piano", label: "🎹 Documentary Piano" },
  { id: "ambient-storytelling", label: "🌌 Ambient Storytelling" },
];

const EFFECTS_OPTIONS = [
  { id: "particles", label: "✨ Light Particles" },
  { id: "glow", label: "💫 Soft Glow" },
  { id: "grain", label: "🎞️ Film Grain" },
  { id: "vignette", label: "🌑 Dark Vignette" },
  { id: "bokeh", label: "🔵 Bokeh Lights" },
  { id: "smoke", label: "🌫️ Smoke Overlay" },
  { id: "letterbox", label: "🎬 Letterbox Bars" },
  { id: "chromatic", label: "🌈 Chromatic Shift" },
];

const TRANSITION_OPTIONS = [
  { id: "fade", label: "Fade" },
  { id: "slide", label: "Slide" },
  { id: "zoom", label: "Zoom" },
  { id: "blur", label: "Blur" },
];

type StudioStep = "select" | "generating_audio" | "building_slides" | "rendering" | "completed" | "failed";

const STEP_PROGRESS: Record<StudioStep, number> = {
  select: 0,
  generating_audio: 25,
  building_slides: 55,
  rendering: 80,
  completed: 100,
  failed: 0,
};

export default function VideoStudio() {
  const { toast } = useToast();
  const { data: books = [] } = useBooks();
  const { data: sermons = [] } = useSermons();
  const { data: blogs = [] } = useBlogPosts();

  // Content
  const [contentType, setContentType] = useState<"book" | "sermon" | "blog" | "custom">("book");
  const [selectedContentId, setSelectedContentId] = useState("");
  const [customText, setCustomText] = useState("");

  // Voice
  const [voiceProvider, setVoiceProvider] = useState<"openai" | "elevenlabs">("openai");
  const [voiceId, setVoiceId] = useState("onyx");
  const [tone, setTone] = useState("cinematic");
  const [autoVoiceMatch, setAutoVoiceMatch] = useState(true);
  const [voiceMixer, setVoiceMixer] = useState({ speed: 1.0, pitch: 1.0, depth: 50 });
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  // Options
  const [viralMode, setViralMode] = useState(false);
  const [cinematicStoryMode, setCinematicStoryMode] = useState(true);
  const [musicStyle, setMusicStyle] = useState("");
  const [effects, setEffects] = useState<string[]>([]);
  const [outputFormat, setOutputFormat] = useState("16:9");
  const [transition, setTransition] = useState("fade");
  const [showNarrationText, setShowNarrationText] = useState(true);
  const [enableBranding, setEnableBranding] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState("");

  // Background music panel settings
  const [userMusicSettings, setUserMusicSettings] = useState<MusicSettings>({
    enabled: false,
    selectedTrackUrl: "",
    loop: false,
    fadeIn: 3,
    fadeOut: 3,
    volume: 50,
  });

  // Custom slides upload
  const [customSlideImages, setCustomSlideImages] = useState<string[]>([]);
  const [customVideoUrl, setCustomVideoUrl] = useState<string>("");
  const [videoLoop, setVideoLoop] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [publishingToYouTube, setPublishingToYouTube] = useState(false);
  // Prompt-to-video
  const [promptText, setPromptText] = useState("");
  const [studioMode, setStudioMode] = useState<"full" | "nano">("full");
  const [musicUrl, setMusicUrl] = useState("");
  const [videoOutputUrl, setVideoOutputUrl] = useState("");

  // Pipeline
  const [step, setStep] = useState<StudioStep>("select");
  const [audioUrl, setAudioUrl] = useState("");
  const [slides, setSlides] = useState<SceneSlide[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  // YouTube optimizer
  const [youtubeMetadata, setYoutubeMetadata] = useState<YouTubeMetadata | null>(null);

  // Shorts generator
  const [generatedShorts, setGeneratedShorts] = useState<ShortClip[]>([]);

  const voices = voiceProvider === "openai" ? OPENAI_VOICES : ELEVENLABS_VOICES;

  // Auto voice match when tone changes
  useEffect(() => {
    if (!autoVoiceMatch) return;
    const match = autoMatchVoice(tone);
    setVoiceProvider(match.provider);
    setVoiceId(match.voiceId);
  }, [tone, autoVoiceMatch]);

  useEffect(() => {
    if (autoVoiceMatch) return;
    setVoiceId(voiceProvider === "openai" ? "onyx" : "JBFqnCBsd6RMkjVDRZzb");
  }, [voiceProvider, autoVoiceMatch]);

  // Apply preset
  const applyPreset = useCallback((presetId: string) => {
    const preset = EXPORT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPreset(presetId);
    setEffects(preset.effects);
    setTransition(preset.transition);
    setViralMode(preset.viralMode);
    toast({ title: "Preset Applied", description: preset.label });
  }, [toast]);

  const contentText = useMemo(() => {
    if (contentType === "custom") return customText;
    if (contentType === "blog") {
      const b = blogs.find((b) => b.id === selectedContentId);
      return b ? (b.content || "").replace(/<[^>]*>/g, "").trim() : "";
    }
    if (contentType === "sermon") {
      const s = sermons.find((s) => s.id === selectedContentId);
      return s ? (s.manuscript || "").replace(/<[^>]*>/g, "").trim() : "";
    }
    const b = books.find((b) => b.id === selectedContentId);
    return b ? (b.description || "").replace(/<[^>]*>/g, "").trim() : "";
  }, [contentType, selectedContentId, customText, books, sermons, blogs]);

  const contentTitle = useMemo(() => {
    if (contentType === "custom") return "Custom Video";
    if (contentType === "blog") return blogs.find((b) => b.id === selectedContentId)?.title || "Blog Video";
    if (contentType === "sermon") return sermons.find((s) => s.id === selectedContentId)?.title || "Sermon Video";
    return books.find((b) => b.id === selectedContentId)?.title || "Book Video";
  }, [contentType, selectedContentId, books, sermons, blogs]);

  /* ─── Generate audio via existing TTS proxy ─── */
  const generateAudio = async (text: string, title: string): Promise<string | null> => {
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
        body: JSON.stringify({
          text: text.slice(0, 4000),
          voice: voiceId,
          title,
          provider: voiceProvider,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: `Server error (${response.status})` }));
      throw new Error(err.error || `Audio generation failed (${response.status})`);
    }

    const data = await response.json();
    return data.audioUrl || null;
  };

  /* ─── Handle slide image upload ─── */
  const handleSlideImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const fileName = `slide-${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from("audio-files").upload(`slides/${fileName}`, file, {
        contentType: file.type,
        upsert: true,
      });
      if (!error) {
        const { data: pub } = supabase.storage.from("audio-files").getPublicUrl(`slides/${fileName}`);
        urls.push(pub.publicUrl);
      }
    }
    setCustomSlideImages((prev) => [...prev, ...urls]);
    toast({ title: "Slides Uploaded", description: `${urls.length} image(s) added.` });
  };

  /* ─── Voice preview ─── */
  const previewVoice = async (vId: string) => {
    setPreviewingVoice(vId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const sampleText = "The truth is not always easy to hear, but it is always worth seeking.";
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ text: sampleText, voice: vId, title: "preview", provider: voiceProvider }),
        }
      );
      if (!response.ok) throw new Error("Preview failed");
      const data = await response.json();
      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audio.playbackRate = voiceMixer.speed;
        audio.play();
      }
    } catch (e: any) {
      toast({ title: "Preview Error", description: e.message, variant: "destructive" });
    } finally {
      setPreviewingVoice(null);
    }
  };

  /* ─── Video upload for voiceover ─── */
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max video size is 100MB.", variant: "destructive" });
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const fileName = `voiceover-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from("audio-files").upload(`videos/uploads/${fileName}`, file, {
      contentType: file.type, upsert: true,
    });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    const { data: pub } = supabase.storage.from("audio-files").getPublicUrl(`videos/uploads/${fileName}`);
    setCustomVideoUrl(pub.publicUrl);
    toast({ title: "Video Uploaded", description: "Video ready for voiceover." });
  };

  /* ─── Thumbnail upload ─── */
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max thumbnail size is 10MB.", variant: "destructive" });
      return;
    }
    const fileName = `thumb-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from("video-thumbnails").upload(fileName, file, {
      contentType: file.type, upsert: true,
    });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    const { data: pub } = supabase.storage.from("video-thumbnails").getPublicUrl(fileName);
    setThumbnailUrl(pub.publicUrl);
    toast({ title: "Thumbnail Uploaded", description: "Thumbnail ready for publishing." });
  };

  /* ─── Publish to YouTube ─── */
  const publishToYouTube = async () => {
    if (!videoOutputUrl) {
      toast({ title: "No Video", description: "Render the video first before publishing.", variant: "destructive" });
      return;
    }
    setPublishingToYouTube(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const ytTitle = youtubeMetadata?.titles?.[0] || contentTitle;
      const ytDesc = youtubeMetadata?.description || `Video created with Island of One Video Studio`;
      const ytTags = youtubeMetadata?.tags || [];

      const response = await supabase.functions.invoke("publish-to-youtube", {
        body: {
          videoUrl: videoOutputUrl,
          title: ytTitle,
          description: ytDesc,
          tags: ytTags,
          thumbnailUrl: thumbnailUrl || undefined,
        },
      });

      if (response.error) throw new Error(response.error.message || "YouTube publish failed");

      const data = response.data as any;
      toast({
        title: "Published to YouTube!",
        description: data?.youtubeUrl ? `Video live at ${data.youtubeUrl}` : "Video uploaded successfully.",
      });
    } catch (err: any) {
      toast({ title: "YouTube Publish Failed", description: err.message, variant: "destructive" });
    } finally {
      setPublishingToYouTube(false);
    }
  };

  /* ─── Main pipeline ─── */
  const runPipeline = async () => {
    const text = contentText || promptText;
    if (!text.trim()) {
      toast({ title: "No Content", description: "Select content or enter text first.", variant: "destructive" });
      return;
    }

    setErrorMsg("");
    setYoutubeMetadata(null);
    setGeneratedShorts([]);

    try {
      setStep("generating_audio");
      const url = await generateAudio(text, contentTitle);
      if (!url) throw new Error("No audio URL returned");
      setAudioUrl(url);

      if (musicStyle && musicStyle !== "none") {
        try {
          const musicPromptMap: Record<string, string> = {
            "cinematic-emotional": "Cinematic emotional orchestral background, sweeping strings, hopeful",
            "worship-instrumental": "Gentle worship instrumental, piano and pads, peaceful",
            "documentary-piano": "Documentary piano score, thoughtful, measured pace",
            "ambient-storytelling": "Ambient storytelling music, soft synths, atmospheric",
          };
          const { data: { session: mSess } } = await supabase.auth.getSession();
          const musicRes = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-music`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${mSess?.access_token}` },
              body: JSON.stringify({ prompt: musicPromptMap[musicStyle] || "Cinematic background music", duration: 30 }),
            }
          );
          if (musicRes.ok) {
            const musicData = await musicRes.json();
            setMusicUrl(musicData.musicUrl || "");
          }
        } catch (e) {
          console.warn("Music generation skipped:", e);
        }
      }

      setStep("building_slides");
      await new Promise((r) => setTimeout(r, 800));

      // Use cinematic engine for intelligent slide building
      const processed = processCinematicScript(text, {
        viralMode,
        cinematicStoryMode,
        customImages: customSlideImages,
      });

      let finalSlides = processed.slides;

      // Apply viral hook boost if enabled
      if (viralMode) {
        finalSlides = applyViralHookBoost(finalSlides);
      }

      setSlides(finalSlides);

      setStep("rendering");
      await new Promise((r) => setTimeout(r, 500));

      await supabase.from("video_projects").insert({
        title: contentTitle,
        content_type: contentType,
        content_id: selectedContentId || null,
        custom_text: contentType === "custom" ? customText : "",
        voice_provider: voiceProvider,
        voice_id: voiceId,
        tone,
        audio_url: url,
        slides: finalSlides as any,
        status: "completed",
        viral_mode: viralMode,
        music_style: musicStyle,
        effects: effects as any,
        output_format: outputFormat,
        prompt: promptText,
      });

      // Generate YouTube metadata
      const ytMeta = generateYouTubeMetadata(contentTitle, text, tone);
      setYoutubeMetadata(ytMeta);

      // Generate shorts candidates
      const shorts = generateShortsFromSlides(finalSlides);
      setGeneratedShorts(shorts);

      setStep("completed");
      toast({ title: "Video Ready!", description: "Your cinematic video has been generated." });
    } catch (err: any) {
      console.error("Pipeline error:", err);
      setErrorMsg(err.message || "Unknown error");
      setStep("failed");
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    }
  };

  const resetStudio = () => {
    setStep("select");
    setAudioUrl("");
    setSlides([]);
    setErrorMsg("");
    setMusicUrl("");
    setVideoOutputUrl("");
    setYoutubeMetadata(null);
    setGeneratedShorts([]);
  };

  const toggleEffect = (id: string) => {
    setEffects((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  };

  const isProcessing = ["generating_audio", "building_slides", "rendering"].includes(step);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Film className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Video Studio</h1>
            <p className="text-sm text-muted-foreground">Turn books, sermons & blogs into cinematic videos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/video-library">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Library className="h-3.5 w-3.5" /> Video Library
            </Button>
          </Link>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setStudioMode("full")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${studioMode === "full" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Film className="h-3.5 w-3.5 inline mr-1.5" />Full Studio
            </button>
            <button
              onClick={() => setStudioMode("nano")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${studioMode === "nano" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Zap className="h-3.5 w-3.5 inline mr-1.5" />Nano Studio
            </button>
          </div>
        </div>
      </div>

      {studioMode === "nano" ? (
        <NanoStudio />
      ) : (
      <>

      {/* ─── Prompt-to-Video ─── */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" /> Prompt to Video
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="e.g. Turn this into a cinematic story video about redemption..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="flex-1"
              disabled={isProcessing}
            />
            <Button
              onClick={() => {
                if (promptText.trim()) {
                  setContentType("custom");
                  setCustomText(promptText);
                  runPipeline();
                }
              }}
              disabled={!promptText.trim() || isProcessing}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" /> Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      {step !== "select" && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                {step === "completed" && <Play className="h-4 w-4 text-green-500" />}
                {step === "failed" && <AlertCircle className="h-4 w-4 text-destructive" />}
                <span className="text-sm font-medium capitalize">
                  {step.replace(/_/g, " ")}
                </span>
              </div>
              {(step === "completed" || step === "failed") && (
                <Button variant="outline" size="sm" onClick={resetStudio} className="gap-1">
                  <RotateCcw className="h-3.5 w-3.5" /> New Video
                </Button>
              )}
            </div>
            <Progress value={STEP_PROGRESS[step]} className="h-2" />
            {step === "failed" && errorMsg && (
              <div className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> {errorMsg}
                <Button variant="outline" size="sm" onClick={runPipeline} className="ml-auto gap-1">
                  <RotateCcw className="h-3.5 w-3.5" /> Retry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ─── Left: Content + Voice Config ─── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Content Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Content Source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={contentType} onValueChange={(v) => setContentType(v as any)}>
                <TabsList className="w-full">
                  <TabsTrigger value="book" className="flex-1 gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" /> Book
                  </TabsTrigger>
                  <TabsTrigger value="sermon" className="flex-1 gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Sermon
                  </TabsTrigger>
                  <TabsTrigger value="blog" className="flex-1 gap-1.5">
                    <Newspaper className="h-3.5 w-3.5" /> Blog
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="flex-1 gap-1.5">
                    <PenLine className="h-3.5 w-3.5" /> Custom
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="book" className="mt-3">
                  <Select value={selectedContentId} onValueChange={setSelectedContentId}>
                    <SelectTrigger><SelectValue placeholder="Select a book..." /></SelectTrigger>
                    <SelectContent>
                      {books.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>

                <TabsContent value="sermon" className="mt-3">
                  <Select value={selectedContentId} onValueChange={setSelectedContentId}>
                    <SelectTrigger><SelectValue placeholder="Select a sermon..." /></SelectTrigger>
                    <SelectContent>
                      {sermons.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>

                <TabsContent value="blog" className="mt-3">
                  <Select value={selectedContentId} onValueChange={setSelectedContentId}>
                    <SelectTrigger><SelectValue placeholder="Select a blog post..." /></SelectTrigger>
                    <SelectContent>
                      {blogs.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>

                <TabsContent value="custom" className="mt-3">
                  <Textarea
                    placeholder="Paste your text here..."
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    rows={6}
                  />
                </TabsContent>
              </Tabs>

              {contentText && (
                <div className="bg-muted/50 rounded-md p-3">
                  <p className="text-xs text-muted-foreground mb-1">Preview ({contentText.length} chars)</p>
                  <p className="text-sm line-clamp-3">{contentText.slice(0, 300)}...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Voice Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mic className="h-4 w-4" /> Voice & Tone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Auto Voice Match Toggle */}
              <div className="flex items-center justify-between border border-border rounded-md p-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <div>
                    <Label className="text-sm font-medium">Auto Voice Match</Label>
                    <p className="text-[10px] text-muted-foreground">AI selects best voice for your tone</p>
                  </div>
                </div>
                <Switch checked={autoVoiceMatch} onCheckedChange={setAutoVoiceMatch} />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Provider</Label>
                  <Select value={voiceProvider} onValueChange={(v) => setVoiceProvider(v as any)} disabled={autoVoiceMatch}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI (13 voices)</SelectItem>
                      <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Voice</Label>
                  <Select value={voiceId} onValueChange={setVoiceId} disabled={autoVoiceMatch}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {voices.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.label} — {v.desc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Voice List with Preview Buttons */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Headphones className="h-3 w-3" /> Test Voices</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {voices.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setVoiceId(v.id);
                        previewVoice(v.id);
                      }}
                      disabled={previewingVoice !== null}
                      className={`flex items-center gap-1.5 text-left p-2 rounded-md border text-[11px] transition-colors ${
                        voiceId === v.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {previewingVoice === v.id ? (
                        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      ) : (
                        <Play className="h-3 w-3 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium truncate">{v.label}</div>
                        <div className="text-muted-foreground truncate text-[9px]">{v.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Mixer */}
              <div className="border border-border rounded-md p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-medium">Voice Mixer</Label>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px]">Speed</Label>
                    <span className="text-[10px] text-muted-foreground">{voiceMixer.speed.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[voiceMixer.speed * 100]}
                    onValueChange={([v]) => setVoiceMixer((p) => ({ ...p, speed: v / 100 }))}
                    min={50} max={200} step={5}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px]">Depth / Warmth</Label>
                    <span className="text-[10px] text-muted-foreground">{voiceMixer.depth}%</span>
                  </div>
                  <Slider
                    value={[voiceMixer.depth]}
                    onValueChange={([v]) => setVoiceMixer((p) => ({ ...p, depth: v }))}
                    min={0} max={100} step={5}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px]">Pitch Shift</Label>
                    <span className="text-[10px] text-muted-foreground">{voiceMixer.pitch.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[voiceMixer.pitch * 100]}
                    onValueChange={([v]) => setVoiceMixer((p) => ({ ...p, pitch: v / 100 }))}
                    min={50} max={150} step={5}
                  />
                </div>
                <p className="text-[9px] text-muted-foreground">Mixer adjustments are applied during preview playback and final render. No extra credit consumed.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Tone</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      className={`text-left p-2.5 rounded-md border text-xs transition-colors ${
                        tone === t.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="font-medium">{t.label}</div>
                      <div className="text-muted-foreground mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Slide Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4" /> Custom Slide Images
                <Badge variant="secondary" className="ml-auto">{customSlideImages.length} uploaded</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Upload background images for your slides. If none uploaded, AI generates keyword-based cinematic visuals automatically.</p>
              <div className="flex gap-2">
                <label className="flex-1">
                  <input type="file" accept="image/*" multiple onChange={handleSlideImageUpload} className="hidden" />
                  <Button variant="outline" className="w-full gap-2" asChild>
                    <span><Plus className="h-4 w-4" /> Upload Images</span>
                  </Button>
                </label>
                {customSlideImages.length > 0 && (
                  <Button variant="outline" size="icon" onClick={() => setCustomSlideImages([])}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {customSlideImages.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {customSlideImages.map((url, i) => (
                    <div key={i} className="aspect-video rounded-md overflow-hidden border border-border relative group">
                      <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0.5 right-1 text-white/70 text-[9px] bg-black/50 px-1 rounded">{i + 1}</span>
                      <button
                        onClick={() => setCustomSlideImages((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Video Upload for Voiceover */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Video className="h-4 w-4" /> Video Upload (Voiceover)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Upload a video file and the studio will place your generated voiceover narration on top of it.</p>
              <label>
                <input type="file" accept="video/mp4,video/webm,video/mov,video/quicktime" onChange={handleVideoUpload} className="hidden" />
                <Button variant="outline" className="w-full gap-2" asChild>
                  <span><Upload className="h-4 w-4" /> Upload Video</span>
                </Button>
              </label>
              {customVideoUrl && (
                <div className="space-y-2">
                  <video src={customVideoUrl} controls loop={videoLoop} className="w-full rounded-md border border-border" style={{ maxHeight: 200 }} />
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-[10px]">Video loaded</Badge>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setCustomVideoUrl("")}>
                      <Trash2 className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  </div>
                  <p className="text-[9px] text-muted-foreground">When rendered, narration audio will be overlaid on this video instead of generated slides.</p>
                </div>
              )}

              {/* Loop Toggle */}
              <div className="flex items-center justify-between border border-border rounded-md p-3">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">Loop Video</Label>
                </div>
                <Switch checked={videoLoop} onCheckedChange={setVideoLoop} />
              </div>

              {/* Thumbnail Upload */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <MonitorPlay className="h-3 w-3" /> Thumbnail Image
                </Label>
                <label>
                  <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleThumbnailUpload} className="hidden" />
                  <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                    <span><Upload className="h-3.5 w-3.5" /> Upload Thumbnail</span>
                  </Button>
                </label>
                {thumbnailUrl && (
                  <div className="relative group">
                    <img src={thumbnailUrl} alt="Thumbnail" className="w-full rounded-md border border-border" style={{ maxHeight: 120 }} />
                    <button
                      onClick={() => setThumbnailUrl("")}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <p className="text-[9px] text-muted-foreground">Used as YouTube thumbnail when publishing. PNG/JPG, max 10MB.</p>
              </div>
            </CardContent>
          </Card>

          {/* Slide Preview */}
          {slides.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MonitorPlay className="h-4 w-4" /> Scene Preview
                  <Badge variant="secondary" className="ml-auto">{slides.length} scenes</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {slides.filter(s => !s.isPause).map((slide, i) => (
                    <div
                      key={i}
                      className="aspect-video rounded-lg overflow-hidden relative flex items-center justify-center p-4"
                      style={{
                        background: slide.image ? `url(${slide.image}) center/cover` : slide.bg,
                      }}
                    >
                      <div className="absolute inset-0 bg-black/30" />
                      <p className="relative z-10 text-white text-xs font-medium text-center leading-relaxed line-clamp-4">
                        {slide.text}
                      </p>
                      <div className="absolute bottom-1.5 right-2 flex items-center gap-1">
                        {slide.emotion && slide.emotion !== "neutral" && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0">{slide.emotion}</Badge>
                        )}
                        <span className="text-white/50 text-[10px]">{i + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audio Player */}
          {audioUrl && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Volume2 className="h-4 w-4" /> Generated Audio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <audio controls src={audioUrl} className="w-full" />
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── Right: Options Sidebar ─── */}
        <div className="space-y-4">
          {/* Cinematic Export Presets */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" /> Cinematic Preset
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedPreset} onValueChange={applyPreset}>
                <SelectTrigger><SelectValue placeholder="Choose a preset..." /></SelectTrigger>
                <SelectContent>
                  {EXPORT_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div>
                        <div>{p.label}</div>
                        <div className="text-[10px] text-muted-foreground">{p.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-2">Auto-configures effects, transitions, and pacing.</p>
            </CardContent>
          </Card>

          {/* Cinematic Story Mode */}
          <Card className="border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <Label className="font-medium">Cinematic Story Mode</Label>
                </div>
                <Switch checked={cinematicStoryMode} onCheckedChange={setCinematicStoryMode} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Documentary-style hooks, emotional pacing, scene-aware pauses, YouTube retention optimization.
              </p>
            </CardContent>
          </Card>

          {/* Viral Mode */}
          <Card className="border-amber-500/30">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <Label className="font-medium">Viral Mode</Label>
                </div>
                <Switch checked={viralMode} onCheckedChange={setViralMode} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Hook-first editing, faster cuts, subtitle emphasis, zoom dynamics.
              </p>
            </CardContent>
          </Card>

          {/* Branding */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="h-4 w-4 text-amber-400" />
                  <Label className="font-medium">Island of One Branding</Label>
                </div>
                <Switch checked={enableBranding} onCheckedChange={setEnableBranding} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Watermark, gold cinematic overlay, serif title cards.
              </p>
            </CardContent>
          </Card>

          {/* Background Music (user-uploaded) */}
          <BackgroundMusicPanel settings={userMusicSettings} onChange={setUserMusicSettings} />

          {/* Narration Text Toggle */}
          <NarrationTextToggle enabled={showNarrationText} onChange={setShowNarrationText} />

          {/* AI Music Style (generated) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Music className="h-4 w-4" /> AI Generated Music
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={musicStyle} onValueChange={setMusicStyle}>
                <SelectTrigger><SelectValue placeholder="No AI Music" /></SelectTrigger>
                <SelectContent>
                  {MUSIC_STYLES.map((m) => (
                    <SelectItem key={m.id} value={m.id || "none"}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-2">
                AI music is ignored when user-uploaded background music is active.
              </p>
            </CardContent>
          </Card>

          {/* Effects */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Effects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {EFFECTS_OPTIONS.map((e) => (
                <label key={e.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={effects.includes(e.id)}
                    onChange={() => toggleEffect(e.id)}
                    className="rounded border-border"
                  />
                  <span className="text-sm">{e.label}</span>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Transitions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Transition Style</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {TRANSITION_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTransition(t.id)}
                    className={`p-2 rounded-md border text-xs font-medium transition-colors ${
                      transition === t.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Output Format */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Output Format</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "16:9", label: "YouTube 4K", icon: MonitorPlay },
                  { id: "9:16", label: "Shorts", icon: Smartphone },
                  { id: "1:1", label: "Square", icon: Square },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setOutputFormat(f.id)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-md border text-xs transition-colors ${
                      outputFormat === f.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <f.icon className="h-4 w-4" />
                    {f.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">16:9 renders at 3840×2160 (True 4K)</p>
            </CardContent>
          </Card>

          {/* Generate Button with Credit/Cooldown Controls */}
          <RenderControls
            onRender={runPipeline}
            disabled={isProcessing || (!contentText.trim() && !promptText.trim())}
            isProcessing={isProcessing}
          />

          {/* Publish Options (after completion) */}
          {step === "completed" && (
            <div className="space-y-4">
              {slides.length > 0 && audioUrl && (
                <VideoRenderer
                  slides={slides}
                  audioUrl={audioUrl}
                  musicUrl={userMusicSettings.enabled && userMusicSettings.selectedTrackUrl ? userMusicSettings.selectedTrackUrl : (musicUrl || undefined)}
                  musicVolume={userMusicSettings.enabled ? userMusicSettings.volume / 100 : 0.15}
                  musicFadeIn={userMusicSettings.enabled ? userMusicSettings.fadeIn : 3}
                  musicFadeOut={userMusicSettings.enabled ? userMusicSettings.fadeOut : 3}
                  musicLoop={userMusicSettings.enabled ? userMusicSettings.loop : false}
                  outputFormat={outputFormat}
                  viralMode={viralMode}
                  effects={effects}
                  transition={transition}
                  title={contentTitle}
                  showNarrationText={showNarrationText}
                  enableBranding={enableBranding}
                  exportPreset={selectedPreset}
                  customVideoUrl={customVideoUrl || undefined}
                  voiceMixer={voiceMixer}
                  onComplete={(url) => setVideoOutputUrl(url)}
                />
              )}

              {/* Shorts Generator */}
              {generatedShorts.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Scissors className="h-4 w-4" /> Generated Shorts
                      <Badge variant="secondary" className="text-[10px]">{generatedShorts.length} clips</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-[10px] text-muted-foreground">Vertical clips auto-generated from strong moments. No credit consumed.</p>
                    {generatedShorts.map((clip, i) => (
                      <div key={i} className="border border-border rounded-md p-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">Clip {i + 1}</span>
                          <Badge variant="outline" className="text-[9px]">Scenes {clip.startSlide + 1}–{clip.endSlide + 1}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">"{clip.hookText}"</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* YouTube Optimizer */}
              {youtubeMetadata && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Youtube className="h-4 w-4 text-red-500" /> YouTube Optimizer
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Title Options</p>
                      {youtubeMetadata.titles.map((t, i) => (
                        <p key={i} className="text-xs font-medium mb-0.5">• {t}</p>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Description</p>
                      <p className="text-xs whitespace-pre-line line-clamp-4">{youtubeMetadata.description}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {youtubeMetadata.tags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-[9px]">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Thumbnail Ideas</p>
                      {youtubeMetadata.thumbnailIdeas.map((t, i) => (
                        <p key={i} className="text-[10px] text-muted-foreground">💡 {t}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Share2 className="h-4 w-4" /> Publish Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {audioUrl && (
                    <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                      <a href={audioUrl} download>
                        <Download className="h-3.5 w-3.5" /> Download Audio
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={publishToYouTube}
                    disabled={!videoOutputUrl || publishingToYouTube}
                  >
                    {publishingToYouTube ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Youtube className="h-3.5 w-3.5" />
                    )}
                    {publishingToYouTube ? "Publishing…" : "Publish to YouTube"}
                  </Button>
                  {thumbnailUrl && (
                    <p className="text-[9px] text-muted-foreground">✓ Custom thumbnail will be used</p>
                  )}
                  <Button variant="outline" size="sm" className="w-full gap-2" disabled>
                    <Share2 className="h-3.5 w-3.5" /> Share Link (coming soon)
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
