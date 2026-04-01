import { useState } from "react";
import {
  Headphones,
  Loader2,
  Volume2,
  Download,
  Mic,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  { id: "onyx", label: "Onyx", desc: "Deep, authoritative" },
  { id: "alloy", label: "Alloy", desc: "Neutral, balanced" },
  { id: "ash", label: "Ash", desc: "Calm, measured" },
  { id: "echo", label: "Echo", desc: "Warm, confident" },
  { id: "fable", label: "Fable", desc: "Expressive, storytelling" },
  { id: "nova", label: "Nova", desc: "Friendly, upbeat" },
  { id: "shimmer", label: "Shimmer", desc: "Clear, gentle" },
  { id: "coral", label: "Coral", desc: "Smooth, warm" },
  { id: "sage", label: "Sage", desc: "Calm, wise" },
];

interface AudioGeneratorProps {
  getText: () => string;
  getTitle: () => string;
  onAudioGenerated?: (audioUrl: string) => void;
  audioUrl?: string | null;
}

export default function AudioGenerator({ getText, getTitle, onAudioGenerated, audioUrl }: AudioGeneratorProps) {
  const [provider, setProvider] = useState<"openai" | "elevenlabs">("openai");
  const [selectedVoice, setSelectedVoice] = useState("onyx");
  const [useClonedVoice, setUseClonedVoice] = useState(false);
  const [clonedVoiceId, setClonedVoiceId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const { toast } = useToast();

  const voices = provider === "elevenlabs" ? ELEVENLABS_VOICES : OPENAI_VOICES;

  const handleProviderChange = (p: "openai" | "elevenlabs") => {
    setProvider(p);
    setSelectedVoice(p === "elevenlabs" ? "deep-smooth" : "onyx");
    if (p === "openai") setUseClonedVoice(false);
  };

  const handleGenerate = async () => {
    const text = getText();
    const title = getTitle();
    if (!text.trim()) {
      toast({ title: "No content", description: "There's no text to convert to audio.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setProgress(`Generating with ${provider === "openai" ? "OpenAI" : "ElevenLabs"}...`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated. Please sign in first.");

      const voice = useClonedVoice && clonedVoiceId.trim() ? clonedVoiceId.trim() : selectedVoice;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ text, voice, title, provider }),
        }
      );

      if (!response.ok) {
        let errMsg = `Generation failed (${response.status})`;
        try { const err = await response.json(); errMsg = err.error || errMsg; } catch {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      toast({ title: "Audio generated!", description: "Your audio is ready to play and download." });
      if (onAudioGenerated) onAudioGenerated(data.audioUrl);
    } catch (err: any) {
      console.error("Audio generation error:", err);
      // Fallback to OpenAI if ElevenLabs fails
      if (provider === "elevenlabs") {
        toast({ title: "ElevenLabs failed", description: "Retrying with OpenAI...", variant: "destructive" });
        setProvider("openai");
        setSelectedVoice("onyx");
        // Don't auto-retry — let user click again
      } else {
        toast({ title: "Audio Error", description: err.message || "Failed to generate audio.", variant: "destructive" });
      }
    } finally {
      setIsGenerating(false);
      setProgress("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Headphones className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Audio Version</span>
      </div>

      {/* Voice Engine */}
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Voice Engine</label>
        <Select value={provider} onValueChange={(v) => handleProviderChange(v as any)}>
          <SelectTrigger className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI (Stable)</SelectItem>
            <SelectItem value="elevenlabs">ElevenLabs (Premium)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Voice Selection */}
      {!useClonedVoice && (
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Voice</label>
          <Select value={selectedVoice} onValueChange={setSelectedVoice}>
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {voices.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  <span className="text-xs font-medium">{v.label}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{v.desc}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Cloned Voice Toggle (ElevenLabs only) */}
      {provider === "elevenlabs" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Mic className="h-3.5 w-3.5 text-primary" />
              <label className="text-xs font-medium">Use My Cloned Voice</label>
            </div>
            <Switch checked={useClonedVoice} onCheckedChange={setUseClonedVoice} />
          </div>
          {useClonedVoice && (
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">ElevenLabs Voice ID</label>
              <Input
                value={clonedVoiceId}
                onChange={(e) => setClonedVoiceId(e.target.value)}
                placeholder="Paste your cloned voice ID..."
                className="text-xs h-8"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Get your voice ID from ElevenLabs Voice Library after cloning.
              </p>
            </div>
          )}
        </div>
      )}

      <Button
        onClick={handleGenerate}
        disabled={isGenerating || (useClonedVoice && !clonedVoiceId.trim())}
        className="w-full"
        size="sm"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
            {progress || "Generating..."}
          </>
        ) : (
          <>
            <Volume2 className="h-3.5 w-3.5 mr-2" />
            Convert to Audio
          </>
        )}
      </Button>

      {audioUrl && (
        <div className="space-y-2 pt-2 border-t border-border">
          <audio controls className="w-full h-10" src={audioUrl}>
            Your browser does not support the audio element.
          </audio>
          <a
            href={audioUrl}
            download
            className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Download className="h-3 w-3" /> Download MP3
          </a>
        </div>
      )}
    </div>
  );
}
