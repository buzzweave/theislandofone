import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Zap, Loader2, Music, Sparkles, RotateCcw, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import VideoRenderer from "./VideoRenderer";

const NANO_MUSIC_STYLES = [
  { id: "cinematic-emotional", label: "🎬 Cinematic Emotional", prompt: "Cinematic emotional orchestral background music, sweeping strings, hopeful and dramatic" },
  { id: "worship-piano", label: "🙏 Worship Piano", prompt: "Gentle worship piano instrumental, reflective and peaceful, ambient pads" },
  { id: "ambient-healing", label: "🌿 Ambient Healing", prompt: "Ambient healing meditation music, soft synths, nature-inspired, calming" },
  { id: "epic-trailer", label: "⚡ Epic Trailer", prompt: "Epic cinematic trailer music, powerful drums, rising tension, heroic brass" },
  { id: "lo-fi-chill", label: "🎧 Lo-Fi Chill", prompt: "Lo-fi chill hip hop beat, relaxed, warm vinyl crackle, jazzy chords" },
];

type NanoStep = "idle" | "generating_music" | "building_slides" | "ready" | "failed";

export default function NanoStudio() {
  const { toast } = useToast();

  const [prompt, setPrompt] = useState("");
  const [musicStyle, setMusicStyle] = useState("cinematic-emotional");
  const [duration, setDuration] = useState(60);
  const [includeNarration, setIncludeNarration] = useState(false);
  const [step, setStep] = useState<NanoStep>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [slides, setSlides] = useState<{ text: string; bg: string }[]>([]);

  const isProcessing = step === "generating_music" || step === "building_slides";

  const buildNanoSlides = (text: string): { text: string; bg: string }[] => {
    // Split by line breaks or sentences, create short impactful slides
    const lines = text
      .split(/[.\n]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 3);

    const colors = [
      "linear-gradient(135deg, #0f0c29, #302b63)",
      "linear-gradient(135deg, #1a1a2e, #e94560)",
      "linear-gradient(135deg, #0a0a0a, #c9a227)",
      "linear-gradient(135deg, #141e30, #243b55)",
      "linear-gradient(135deg, #2d1b69, #e94560)",
    ];

    return lines.slice(0, 20).map((line, i) => ({
      text: line.slice(0, 120),
      bg: colors[i % colors.length],
    }));
  };

  const generateNano = async () => {
    if (!prompt.trim()) {
      toast({ title: "Enter a prompt", description: "Describe your video concept.", variant: "destructive" });
      return;
    }

    setErrorMsg("");
    try {
      // Step 1: Generate music
      setStep("generating_music");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const selectedStyle = NANO_MUSIC_STYLES.find((m) => m.id === musicStyle);
      const musicPrompt = `${selectedStyle?.prompt || "Cinematic background music"}. Duration: ${duration} seconds.`;

      const musicResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-music`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ prompt: musicPrompt, duration }),
        }
      );

      if (!musicResponse.ok) {
        const err = await musicResponse.json().catch(() => ({ error: "Music generation failed" }));
        throw new Error(err.error || "Music generation failed");
      }

      const musicData = await musicResponse.json();
      setMusicUrl(musicData.musicUrl);

      // Step 2: Build text slides from the prompt
      setStep("building_slides");
      await new Promise((r) => setTimeout(r, 500));
      const sl = buildNanoSlides(prompt);
      setSlides(sl);

      setStep("ready");
      toast({ title: "Nano Video Ready!", description: "Review slides and render your video." });
    } catch (err: any) {
      console.error("Nano error:", err);
      setErrorMsg(err.message || "Unknown error");
      setStep("failed");
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    }
  };

  const reset = () => {
    setStep("idle");
    setMusicUrl("");
    setSlides([]);
    setErrorMsg("");
  };

  return (
    <div className="space-y-4">
      <Card className="border-violet-500/30 bg-violet-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-violet-400" /> Nano Studio
            <Badge variant="secondary" className="text-[10px]">Beta</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Create short-form AI videos from prompts. Text overlays + music, no narration needed.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Video Prompt</Label>
            <Textarea
              placeholder="e.g. Create a 60-second poetic video about healing and hope…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              disabled={isProcessing}
            />
            <p className="text-[10px] text-muted-foreground">
              Each line or sentence becomes a slide. Write short, impactful lines.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <Music className="h-3.5 w-3.5" /> Music Style
              </Label>
              <Select value={musicStyle} onValueChange={setMusicStyle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NANO_MUSIC_STYLES.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Duration (seconds)</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30s — Quick clip</SelectItem>
                  <SelectItem value="60">60s — Standard</SelectItem>
                  <SelectItem value="90">90s — Extended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between border border-border rounded-md p-3">
            <div>
              <Label className="text-sm">Include Narration</Label>
              <p className="text-[10px] text-muted-foreground">Add voice-over (requires extra generation)</p>
            </div>
            <Switch checked={includeNarration} onCheckedChange={setIncludeNarration} />
          </div>

          {/* Progress */}
          {step !== "idle" && step !== "ready" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin text-violet-400" />}
                {step === "failed" && <AlertCircle className="h-4 w-4 text-destructive" />}
                <span className="capitalize">{step.replace(/_/g, " ")}</span>
              </div>
              <Progress
                value={step === "generating_music" ? 40 : step === "building_slides" ? 80 : 0}
                className="h-1.5"
              />
              {step === "failed" && errorMsg && (
                <p className="text-xs text-destructive">{errorMsg}</p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={generateNano}
              disabled={!prompt.trim() || isProcessing}
              className="gap-2 flex-1"
            >
              {isProcessing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Create Nano Video</>
              )}
            </Button>
            {(step === "ready" || step === "failed") && (
              <Button variant="outline" onClick={reset} className="gap-1">
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Slide Preview */}
      {slides.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Slides Preview <Badge variant="secondary">{slides.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {slides.map((slide, i) => (
                <div
                  key={i}
                  className="aspect-video rounded-md overflow-hidden relative flex items-center justify-center p-3"
                  style={{ background: slide.bg }}
                >
                  <div className="absolute inset-0 bg-black/30" />
                  <p className="relative z-10 text-white text-[10px] font-bold text-center leading-snug line-clamp-3">
                    {slide.text}
                  </p>
                  <span className="absolute bottom-1 right-1.5 text-white/40 text-[8px]">{i + 1}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Music Player */}
      {musicUrl && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Music className="h-3.5 w-3.5" /> Generated Music
            </CardTitle>
          </CardHeader>
          <CardContent>
            <audio controls src={musicUrl} className="w-full" />
          </CardContent>
        </Card>
      )}

      {/* Video Renderer */}
      {step === "ready" && slides.length > 0 && (
        <VideoRenderer
          slides={slides}
          audioUrl={musicUrl}
          outputFormat="9:16"
          viralMode={true}
          effects={["vignette", "particles"]}
          title="Nano Video"
        />
      )}
    </div>
  );
}
