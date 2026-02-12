import { useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export const VOICE_OPTIONS = [
  { id: "deep-smooth", label: "Deep & Smooth (James Earl Jones style)", desc: "Rich, authoritative baritone" },
  { id: "warm-narrator", label: "Warm Narrator", desc: "Warm, engaging male voice" },
  { id: "calm-male", label: "Calm & Collected", desc: "Calm, measured male voice" },
  { id: "rich-female", label: "Rich Female", desc: "Expressive, warm female voice" },
  { id: "smooth-male", label: "Smooth Male", desc: "Silky smooth male narration" },
  { id: "classic-narrator", label: "Classic Narrator", desc: "Traditional audiobook voice" },
  { id: "gentle-female", label: "Gentle Female", desc: "Soft, gentle female voice" },
] as const;

export type VoiceId = typeof VOICE_OPTIONS[number]["id"];

interface UseAudioGenerationReturn {
  isGenerating: boolean;
  progress: string;
  generateAudio: (text: string, title: string, voice: VoiceId) => Promise<string | null>;
}

export function useAudioGeneration(): UseAudioGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const { toast } = useToast();

  const generateAudio = async (text: string, title: string, voice: VoiceId): Promise<string | null> => {
    if (!text.trim()) {
      toast({ title: "No content", description: "There's no text to convert to audio.", variant: "destructive" });
      return null;
    }

    setIsGenerating(true);
    setProgress("Sending to ElevenLabs...");

    try {
      const data = await api.post<{ audioUrl: string }>("/api/text-to-speech", { text, voice, title });

      setProgress("Audio generated!");
      toast({ title: "Audio generated!", description: "Your audiobook is ready to play and download." });
      return data.audioUrl;
    } catch (err: any) {
      console.error("Audio generation error:", err);
      toast({ title: "Audio Error", description: err.message || "Failed to generate audio.", variant: "destructive" });
      return null;
    } finally {
      setIsGenerating(false);
      setProgress("");
    }
  };

  return { isGenerating, progress, generateAudio };
}
