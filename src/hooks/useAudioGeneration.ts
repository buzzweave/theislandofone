import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated. Please sign in first.");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ text, voice, title }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: `Server error (${response.status})` }));
        throw new Error(err.error || `Generation failed (${response.status})`);
      }

      const data = await response.json();

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
