import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Download, Film, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Slide {
  text: string;
  bg: string;
  image?: string;
}

interface VideoRendererProps {
  slides: Slide[];
  audioUrl: string;
  musicUrl?: string;
  musicVolume?: number;
  musicFadeIn?: number;
  musicFadeOut?: number;
  outputFormat: string;
  viralMode: boolean;
  effects: string[];
  transition?: string;
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
  musicVolume = 0.15,
  musicFadeIn = 3,
  musicFadeOut = 3,
  outputFormat,
  viralMode,
  effects,
  transition = "fade",
  title,
  onComplete,
}: VideoRendererProps) {
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Preload images for slides
  const loadSlideImages = async (slides: Slide[]): Promise<(HTMLImageElement | null)[]> => {
    return Promise.all(
      slides.map((slide) => {
        if (!slide.image) return Promise.resolve(null);
        return new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = slide.image!;
        });
      })
    );
  };

  const renderVideo = useCallback(async () => {
    if (!canvasRef.current || slides.length === 0) return;

    setRendering(true);
    setProgress(0);

    const dims = FORMAT_DIMS[outputFormat] || FORMAT_DIMS["16:9"];
    const canvas = canvasRef.current;
    canvas.width = dims.w;
    canvas.height = dims.h;
    const ctx = canvas.getContext("2d")!;

    const slideImages = await loadSlideImages(slides);

    const slideDuration = viralMode ? 3000 : 5000;
    const fps = 30;
    const totalFrames = Math.ceil((slides.length * slideDuration) / (1000 / fps));
    const totalDurationSec = (slides.length * slideDuration) / 1000;

    const stream = canvas.captureStream(fps);

    // Load narration
    const narrationAudio = new Audio(audioUrl);
    narrationAudio.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      narrationAudio.oncanplaythrough = () => resolve();
      narrationAudio.onerror = () => reject(new Error("Failed to load narration audio"));
      narrationAudio.load();
    });

    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();

    const narrationSource = audioCtx.createMediaElementSource(narrationAudio);
    narrationSource.connect(dest);
    narrationSource.connect(audioCtx.destination);

    let musicAudio: HTMLAudioElement | null = null;
    let musicGainNode: GainNode | null = null;
    if (musicUrl) {
      musicAudio = new Audio(musicUrl);
      musicAudio.crossOrigin = "anonymous";
      await new Promise<void>((resolve) => {
        musicAudio!.oncanplaythrough = () => resolve();
        musicAudio!.onerror = () => resolve();
        musicAudio!.load();
      });
      const musicSource = audioCtx.createMediaElementSource(musicAudio);
      musicGainNode = audioCtx.createGain();
      musicGainNode.gain.value = 0; // start at 0 for fade-in
      musicSource.connect(musicGainNode);
      musicGainNode.connect(dest);

      // Schedule fade-in
      musicGainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      musicGainNode.gain.linearRampToValueAtTime(musicVolume, audioCtx.currentTime + musicFadeIn);
      // Schedule fade-out
      const fadeOutStart = Math.max(0, totalDurationSec - musicFadeOut);
      musicGainNode.gain.setValueAtTime(musicVolume, audioCtx.currentTime + fadeOutStart);
      musicGainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + totalDurationSec);
    }

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
      const slideImage = slideImages[slideIdx];

      // Transition calculations
      const transitionDuration = 0.15; // 15% of slide duration
      let transitionAlpha = 1;
      let transitionScale = 1;
      let transitionOffsetX = 0;
      let transitionBlur = 0;

      if (slideProgress < transitionDuration) {
        const tp = slideProgress / transitionDuration;
        if (transition === "fade") transitionAlpha = tp;
        else if (transition === "slide") transitionOffsetX = (1 - tp) * dims.w;
        else if (transition === "zoom") transitionScale = 0.8 + tp * 0.2;
        else if (transition === "blur") transitionBlur = (1 - tp) * 10;
      }

      // Draw background
      ctx.save();
      ctx.globalAlpha = transitionAlpha;
      ctx.translate(transitionOffsetX, 0);
      ctx.translate(dims.w / 2, dims.h / 2);
      ctx.scale(transitionScale, transitionScale);
      ctx.translate(-dims.w / 2, -dims.h / 2);

      if (slideImage) {
        // Ken Burns with image
        const scale = 1 + slideProgress * 0.05;
        ctx.save();
        ctx.translate(dims.w / 2, dims.h / 2);
        ctx.scale(scale, scale);
        ctx.translate(-dims.w / 2, -dims.h / 2);
        ctx.drawImage(slideImage, 0, 0, dims.w, dims.h);
        ctx.restore();
      } else {
        const gradient = ctx.createLinearGradient(0, 0, dims.w, dims.h);
        gradient.addColorStop(0, "#1a1a2e");
        gradient.addColorStop(1, "#16213e");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, dims.w, dims.h);
      }

      // Ken Burns zoom
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
          ctx.fillRect(Math.random() * dims.w, Math.random() * dims.h, Math.random() * 3, Math.random() * 3);
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

      if (effects.includes("bokeh")) {
        for (let i = 0; i < 8; i++) {
          const bx = (Math.sin(frame * 0.005 + i * 1.3) * 0.5 + 0.5) * dims.w;
          const by = (Math.cos(frame * 0.007 + i * 0.9) * 0.5 + 0.5) * dims.h;
          const br = 20 + Math.sin(frame * 0.02 + i) * 15;
          const bGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
          bGrad.addColorStop(0, "rgba(255,255,255,0.15)");
          bGrad.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = bGrad;
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (effects.includes("smoke")) {
        ctx.fillStyle = `rgba(100,100,120,${0.05 + Math.sin(frame * 0.01) * 0.03})`;
        ctx.fillRect(0, dims.h * 0.6, dims.w, dims.h * 0.4);
      }

      if (effects.includes("letterbox")) {
        ctx.fillStyle = "rgba(0,0,0,0.95)";
        const barH = dims.h * 0.08;
        ctx.fillRect(0, 0, dims.w, barH);
        ctx.fillRect(0, dims.h - barH, dims.w, barH);
      }

      if (effects.includes("chromatic")) {
        ctx.fillStyle = `rgba(255,0,0,${0.015 + Math.sin(frame * 0.04) * 0.01})`;
        ctx.fillRect(3, 0, dims.w, dims.h);
        ctx.fillStyle = `rgba(0,0,255,${0.015 + Math.cos(frame * 0.04) * 0.01})`;
        ctx.fillRect(-3, 0, dims.w, dims.h);
      }

      ctx.restore();

      // Text with word-sync fade animation
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

      // Word-by-word reveal for sync with narration
      const totalWords = words.length;
      const wordsRevealed = Math.ceil(slideProgress * totalWords);

      let wordCount = 0;
      lines.forEach((line, lineIdx) => {
        const lineWords = line.split(" ");
        let displayLine = "";
        for (const w of lineWords) {
          wordCount++;
          if (wordCount <= wordsRevealed) {
            displayLine += (displayLine ? " " : "") + w;
          }
        }
        if (displayLine) {
          ctx.fillText(displayLine, dims.w / 2, startY + lineIdx * lineHeight);
        }
      });

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.restore();

      frame++;
      setProgress(Math.round((frame / totalFrames) * 100));
      requestAnimationFrame(drawFrame);
    };

    drawFrame();

    const blob = await recordingDone;

    // Upload
    try {
      const fileName = `video-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("audio-files")
        .upload(`videos/${fileName}`, blob, {
          contentType: "video/webm",
          upsert: true,
        });

      if (uploadError) {
        console.error("Video upload error:", uploadError);
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
  }, [slides, audioUrl, musicUrl, musicVolume, musicFadeIn, musicFadeOut, outputFormat, viralMode, effects, transition, title, onComplete, toast]);

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
