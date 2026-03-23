import { useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Upload, Play, Pause, Download, RotateCcw, Film, Scissors,
  Loader2, CheckCircle2, Sparkles,
} from "lucide-react";
import { useClipEditor } from "@/components/admin/clip-studio/useClipEditor";
import ClipTimeline from "@/components/admin/clip-studio/ClipTimeline";
import EditControls from "@/components/admin/clip-studio/EditControls";
import LogoOverlay from "@/components/admin/clip-studio/LogoOverlay";

export default function VideoStudio() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    state, update, loadVideo, togglePlay, seek, exportClip, reset,
    videoRef, canvasRef, onVideoLoaded,
  } = useClipEditor();

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("video/")) loadVideo(file);
    else toast({ title: "Invalid file", description: "Please drop an MP4 video file.", variant: "destructive" });
  }, [loadVideo, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadVideo(file);
    if (e.target) e.target.value = "";
  }, [loadVideo]);

  const handleExport = useCallback(async () => {
    const url = await exportClip();
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = `clip-${Date.now()}.webm`;
      a.click();
      toast({ title: "Export Complete", description: "Your clip has been downloaded." });
    }
  }, [exportClip, toast]);

  // No video loaded — upload screen
  if (!state.videoUrl) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card
          className="w-full max-w-lg p-8 flex flex-col items-center gap-6 border-dashed border-2 border-border bg-card/50 cursor-pointer hover:border-primary/40 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Film className="h-10 w-10 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold font-display">Clip Studio</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Drop a sermon or service video file here, or tap to upload. Create dynamic short-form clips for social media.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {["MP4", "WebM", "MOV"].map((f) => (
              <span key={f} className="text-[10px] px-2 py-1 rounded-full bg-secondary text-secondary-foreground">{f}</span>
            ))}
          </div>
          <Button variant="default" size="lg" className="gap-2">
            <Upload className="h-4 w-4" /> Upload Video
          </Button>
          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
        </Card>
      </div>
    );
  }

  // Editor view
  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold">Clip Studio</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> New
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleExport}
            disabled={state.isExporting}
          >
            {state.isExporting ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Exporting...</>
            ) : (
              <><Download className="h-3.5 w-3.5" /> Export Clip</>
            )}
          </Button>
        </div>
      </div>

      {/* Export progress */}
      {state.isExporting && (
        <div className="space-y-1">
          <Progress value={state.exportProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">{Math.round(state.exportProgress)}% — Rendering clip...</p>
        </div>
      )}

      {/* Preview + Controls layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Preview area */}
        <div className="space-y-3">
          {/* Canvas preview */}
          <div className="relative bg-black rounded-xl overflow-hidden flex items-center justify-center border border-border"
            style={{ aspectRatio: state.aspectRatio === "9:16" ? "9/16" : state.aspectRatio === "1:1" ? "1/1" : "16/9", maxHeight: "70vh" }}
          >
            <canvas ref={canvasRef} className="w-full h-full object-contain" />

            {/* Play/Pause overlay */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors group"
            >
              {!state.isPlaying && (
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="h-7 w-7 text-white ml-1" />
                </div>
              )}
            </button>

            {/* Format badge */}
            <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/60 text-[10px] text-white font-semibold">
              {state.aspectRatio}
            </div>
          </div>

          {/* Hidden video element */}
          <video
            ref={videoRef}
            src={state.videoUrl}
            onLoadedMetadata={onVideoLoaded}
            className="hidden"
            playsInline
            preload="auto"
          />

          {/* Playback controls */}
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => seek(Math.max(state.trimStart, state.currentTime - 5))}>
              -5s
            </Button>
            <Button size="lg" variant="default" className="rounded-full w-12 h-12" onClick={togglePlay}>
              {state.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => seek(Math.min(state.trimEnd, state.currentTime + 5))}>
              +5s
            </Button>
          </div>

          {/* Timeline */}
          <ClipTimeline
            duration={state.duration}
            currentTime={state.currentTime}
            trimStart={state.trimStart}
            trimEnd={state.trimEnd}
            onSeek={seek}
            onTrimStartChange={(t) => update({ trimStart: t })}
            onTrimEndChange={(t) => update({ trimEnd: t })}
          />
        </div>

        {/* Side controls */}
        <div className="space-y-4">
          <Card className="p-4 bg-card/50 border-border space-y-5">
            <EditControls
              zoom={state.zoom}
              zoomX={state.zoomX}
              zoomY={state.zoomY}
              speed={state.speed}
              isMuted={state.isMuted}
              volume={state.volume}
              aspectRatio={state.aspectRatio}
              onUpdate={update}
            />
          </Card>

          <Card className="p-4 bg-card/50 border-border">
            <LogoOverlay
              logoUrl={state.logoUrl}
              logoPosition={state.logoPosition}
              logoScale={state.logoScale}
              onUpdate={update}
            />
          </Card>

          {/* Quick tips */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Pro Tips</p>
                <p>• Use <strong>9:16</strong> for Instagram Reels & YouTube Shorts</p>
                <p>• <strong>Zoom in</strong> on the speaker for vertical clips</p>
                <p>• Add your church <strong>logo</strong> for branding</p>
                <p>• Use <strong>0.5x speed</strong> for dramatic altar moments</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
