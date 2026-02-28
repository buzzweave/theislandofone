import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Download, Film, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Slide {
  text: string;
  bg: string;
}

interface VideoRendererProps {
  slides: Slide[];
  audioUrl: string;
  musicUrl?: string;
  outputFormat: string;
  viralMode: boolean;
  effects: string[];
  title: string;
  onComplete?: (videoUrl: string) => void;
}

const FORMAT_DIMS: Record<string, { w: number; h: number }> = {
  "16:9": { w: 1920, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
  "1:1": { w: 1080, h: 1080 },
};

export default function VideoRenderer({
  slides,
  audioUrl,
  musicUrl,
  outputFormat,
  viralMode,
  effects,
  title,
  onComplete,
}: VideoRendererProps) {
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const renderVideo = useCallback(async () => {
    if (!canvasRef.current || slides.length === 0) return;

    setRendering(true);
    setProgress(0);

    const dims = FORMAT_DIMS[outputFormat] || FORMAT_DIMS["16:9"];
    const canvas = canvasRef.current;
    canvas.width = dims.w;
    canvas.height = dims.h;
    const ctx = canvas.getContext("2d")!;

    const slideDuration = viralMode ? 3000 : 5000; // ms per slide
    const fps = 30;
    const totalFrames = Math.ceil((slides.length * slideDuration) / (1000 / fps));

    // Set up MediaRecorder
    const stream = canvas.captureStream(fps);

    // Load audio elements
    const narrationAudio = new Audio(audioUrl);
    narrationAudio.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      narrationAudio.oncanplaythrough = () => resolve();
      narrationAudio.onerror = () => reject(new Error("Failed to load narration audio"));
      narrationAudio.load();
    });

    // Create audio context to mix narration + music
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();

    const narrationSource = audioCtx.createMediaElementSource(narrationAudio);
    narrationSource.connect(dest);
    narrationSource.connect(audioCtx.destination);

    let musicAudio: HTMLAudioElement | null = null;
    if (musicUrl) {
      musicAudio = new Audio(musicUrl);
      musicAudio.crossOrigin = "anonymous";
      await new Promise<void>((resolve) => {
        musicAudio!.oncanplaythrough = () => resolve();
        musicAudio!.onerror = () => resolve(); // non-blocking
        musicAudio!.load();
      });
      const musicSource = audioCtx.createMediaElementSource(musicAudio);
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.15; // duck under narration
      musicSource.connect(gainNode);
      gainNode.connect(dest);
    }

    // Add audio tracks to stream
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: 5_000_000,
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const recordingDone = new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        resolve(new Blob(chunks, { type: "video/webm" }));
      };
    });

    mediaRecorder.start(100);
    narrationAudio.play();
    if (musicAudio) musicAudio.play();

    // Render frames
    let frame = 0;
    const drawFrame = () => {
      if (frame >= totalFrames) {
        mediaRecorder.stop();
        narrationAudio.pause();
        if (musicAudio) musicAudio.pause();
        audioCtx.close();
        return;
      }

      const timeMs = (frame / fps) * 1000;
      const slideIdx = Math.min(Math.floor(timeMs / slideDuration), slides.length - 1);
      const slide = slides[slideIdx];
      const slideProgress = (timeMs % slideDuration) / slideDuration;

      // Draw background
      const gradient = ctx.createLinearGradient(0, 0, dims.w, dims.h);
      // Parse bg string for colors - fallback to dark
      gradient.addColorStop(0, "#1a1a2e");
      gradient.addColorStop(1, "#16213e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, dims.w, dims.h);

      // Ken Burns zoom effect
      const scale = 1 + slideProgress * 0.05;
      ctx.save();
      ctx.translate(dims.w / 2, dims.h / 2);
      ctx.scale(scale, scale);
      ctx.translate(-dims.w / 2, -dims.h / 2);

      // Dark overlay
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, dims.w, dims.h);

      // Effects
      if (effects.includes("vignette")) {
        const vGrad = ctx.createRadialGradient(
          dims.w / 2, dims.h / 2, dims.w * 0.3,
          dims.w / 2, dims.h / 2, dims.w * 0.7
        );
        vGrad.addColorStop(0, "rgba(0,0,0,0)");
        vGrad.addColorStop(1, "rgba(0,0,0,0.6)");
        ctx.fillStyle = vGrad;
        ctx.fillRect(0, 0, dims.w, dims.h);
      }

      if (effects.includes("grain")) {
        ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.02})`;
        for (let i = 0; i < 200; i++) {
          ctx.fillRect(
            Math.random() * dims.w,
            Math.random() * dims.h,
            Math.random() * 3,
            Math.random() * 3
          );
        }
      }

      if (effects.includes("particles")) {
        ctx.fillStyle = "rgba(255,215,0,0.3)";
        for (let i = 0; i < 20; i++) {
          const px = (Math.sin(frame * 0.01 + i) * 0.5 + 0.5) * dims.w;
          const py = ((frame * 0.5 + i * 50) % dims.h);
          ctx.beginPath();
          ctx.arc(px, py, 2 + Math.sin(frame * 0.05 + i) * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (effects.includes("glow")) {
        ctx.fillStyle = `rgba(255,215,0,${0.03 + Math.sin(frame * 0.03) * 0.02})`;
        ctx.fillRect(0, 0, dims.w, dims.h);
      }

      ctx.restore();

      // Text with fade-in
      const fadeIn = Math.min(slideProgress * 4, 1);
      const fontSize = viralMode ? dims.w * 0.045 : dims.w * 0.032;
      ctx.globalAlpha = fadeIn;
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${fontSize}px 'Georgia', serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 20;

      // Word wrap
      const maxWidth = dims.w * 0.75;
      const words = slide.text.split(" ");
      const lines: string[] = [];
      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      const lineHeight = fontSize * 1.4;
      const startY = dims.h / 2 - ((lines.length - 1) * lineHeight) / 2;
      lines.forEach((line, i) => {
        ctx.fillText(line, dims.w / 2, startY + i * lineHeight);
      });

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      frame++;
      setProgress(Math.round((frame / totalFrames) * 100));
      requestAnimationFrame(drawFrame);
    };

    drawFrame();

    // Wait for recording to finish
    const blob = await recordingDone;

    // Upload to storage
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const fileName = `video-${Date.now()}.webm`;

      const serviceUrl = import.meta.env.VITE_SUPABASE_URL;
      const formData = new FormData();
      formData.append("", blob, fileName);

      // Upload via supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("audio-files")
        .upload(`videos/${fileName}`, blob, {
          contentType: "video/webm",
          upsert: true,
        });

      if (uploadError) {
        console.error("Video upload error:", uploadError);
        // Still allow download locally
      }

      const { data: publicUrl } = supabase.storage
        .from("audio-files")
        .getPublicUrl(`videos/${fileName}`);

      const url = publicUrl?.publicUrl || URL.createObjectURL(blob);
      setVideoUrl(url);
      onComplete?.(url);
      toast({ title: "Video Rendered!", description: "Your video is ready to download." });
    } catch (err) {
      console.error("Upload failed, using local URL:", err);
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      onComplete?.(url);
    }

    setRendering(false);
  }, [slides, audioUrl, musicUrl, outputFormat, viralMode, effects, title, onComplete, toast]);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="hidden" />

      {!videoUrl && !rendering && (
        <Button onClick={renderVideo} className="w-full gap-2" size="lg">
          <Film className="h-4 w-4" /> Render Video
        </Button>
      )}

      {rendering && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Rendering video… {progress}%
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {videoUrl && (
        <div className="space-y-3">
          <video
            src={videoUrl}
            controls
            className="w-full rounded-lg border border-border"
            style={{ maxHeight: 400 }}
          />
          <Button variant="outline" className="w-full gap-2" asChild>
            <a href={videoUrl} download={`${title || "video"}.webm`}>
              <Download className="h-4 w-4" /> Download Video
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
