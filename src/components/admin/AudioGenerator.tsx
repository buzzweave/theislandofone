import { useState } from "react";
import {
  Headphones,
  Loader2,
  Volume2,
  Download,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAudioGeneration, VOICE_OPTIONS, type VoiceId } from "@/hooks/useAudioGeneration";

interface AudioGeneratorProps {
  getText: () => string;
  getTitle: () => string;
  onAudioGenerated?: (audioUrl: string) => void;
  audioUrl?: string;
}

export default function AudioGenerator({ getText, getTitle, onAudioGenerated, audioUrl }: AudioGeneratorProps) {
  const [selectedVoice, setSelectedVoice] = useState<VoiceId>("deep-smooth");
  const { isGenerating, progress, generateAudio } = useAudioGeneration();

  const handleGenerate = async () => {
    const url = await generateAudio(getText(), getTitle(), selectedVoice);
    if (url && onAudioGenerated) {
      onAudioGenerated(url);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Headphones className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Generate Audiobook</span>
      </div>

      <div>
        <label className="text-xs text-muted-foreground block mb-1">Voice</label>
        <Select value={selectedVoice} onValueChange={(v) => setSelectedVoice(v as VoiceId)}>
          <SelectTrigger className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VOICE_OPTIONS.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                <div>
                  <span className="text-xs font-medium">{v.label}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{v.desc}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
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
