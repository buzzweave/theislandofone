import { useState, useRef, useCallback, useEffect } from "react";

export interface ClipState {
  videoFile: File | null;
  videoUrl: string;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  trimStart: number;
  trimEnd: number;
  speed: number;
  zoom: number;
  zoomX: number; // 0-1 pan position
  zoomY: number;
  isMuted: boolean;
  volume: number;
  aspectRatio: "16:9" | "9:16" | "1:1";
  logoUrl: string;
  logoPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  logoScale: number;
  isExporting: boolean;
  exportProgress: number;
}

const initialState: ClipState = {
  videoFile: null,
  videoUrl: "",
  duration: 0,
  currentTime: 0,
  isPlaying: false,
  trimStart: 0,
  trimEnd: 0,
  speed: 1,
  zoom: 1,
  zoomX: 0.5,
  zoomY: 0.5,
  isMuted: false,
  volume: 1,
  aspectRatio: "9:16",
  logoUrl: "",
  logoPosition: "bottom-right",
  logoScale: 0.15,
  isExporting: false,
  exportProgress: 0,
};

export function useClipEditor() {
  const [state, setState] = useState<ClipState>(initialState);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const animFrameRef = useRef<number>(0);

  const update = useCallback((patch: Partial<ClipState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  // Load video file
  const loadVideo = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    update({ videoFile: file, videoUrl: url, trimStart: 0, trimEnd: 0, currentTime: 0 });
  }, [update]);

  // Load logo
  useEffect(() => {
    if (!state.logoUrl) {
      logoImgRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { logoImgRef.current = img; };
    img.src = state.logoUrl;
  }, [state.logoUrl]);

  // Video metadata loaded
  const onVideoLoaded = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    update({ duration: v.duration, trimEnd: v.duration });
  }, [update]);

  // Play/pause
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime >= state.trimEnd) v.currentTime = state.trimStart;
      v.play();
      update({ isPlaying: true });
    } else {
      v.pause();
      update({ isPlaying: false });
    }
  }, [state.trimEnd, state.trimStart, update]);

  const seek = useCallback((time: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = time;
    update({ currentTime: time });
  }, [update]);

  // Enforce trim bounds during playback
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      update({ currentTime: v.currentTime });
      if (v.currentTime >= state.trimEnd) {
        v.pause();
        v.currentTime = state.trimStart;
        update({ isPlaying: false, currentTime: state.trimStart });
      }
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [state.trimEnd, state.trimStart, update]);

  // Apply speed
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = state.speed;
  }, [state.speed]);

  // Apply volume/mute
  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.muted = state.isMuted;
      v.volume = state.volume;
    }
  }, [state.isMuted, state.volume]);

  // Canvas render loop
  const drawFrame = useCallback(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const vw = v.videoWidth || 1920;
    const vh = v.videoHeight || 1080;

    // Calculate output dimensions based on aspect ratio
    let outW: number, outH: number;
    switch (state.aspectRatio) {
      case "9:16": outW = 1080; outH = 1920; break;
      case "1:1": outW = 1080; outH = 1080; break;
      default: outW = 1920; outH = 1080; break;
    }
    c.width = outW;
    c.height = outH;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, outW, outH);

    // Calculate source crop with zoom
    const outAspect = outW / outH;
    const srcAspect = vw / vh;
    let srcW: number, srcH: number;

    if (outAspect > srcAspect) {
      srcW = vw;
      srcH = vw / outAspect;
    } else {
      srcH = vh;
      srcW = vh * outAspect;
    }

    // Apply zoom
    srcW /= state.zoom;
    srcH /= state.zoom;

    // Pan position
    const maxX = vw - srcW;
    const maxY = vh - srcH;
    const srcX = Math.max(0, Math.min(maxX, state.zoomX * maxX));
    const srcY = Math.max(0, Math.min(maxY, state.zoomY * maxY));

    ctx.drawImage(v, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

    // Draw logo
    const logo = logoImgRef.current;
    if (logo && logo.complete && logo.naturalWidth > 0) {
      const logoW = outW * state.logoScale;
      const logoH = (logo.naturalHeight / logo.naturalWidth) * logoW;
      const pad = outW * 0.03;
      let lx = pad, ly = pad;
      if (state.logoPosition.includes("right")) lx = outW - logoW - pad;
      if (state.logoPosition.includes("bottom")) ly = outH - logoH - pad;
      ctx.drawImage(logo, lx, ly, logoW, logoH);
    }
  }, [state.aspectRatio, state.zoom, state.zoomX, state.zoomY, state.logoScale, state.logoPosition]);

  // Animation loop
  useEffect(() => {
    const loop = () => {
      drawFrame();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [drawFrame]);

  // Export video
  const exportClip = useCallback(async (): Promise<string | null> => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return null;

    update({ isExporting: true, exportProgress: 0 });

    return new Promise((resolve) => {
      const stream = c.captureStream(30);
      // Add audio track if not muted
      if (!state.isMuted) {
        try {
          const audioCtx = new AudioContext();
          const source = audioCtx.createMediaElementSource(v);
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          source.connect(audioCtx.destination);
          dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
        } catch {
          // Audio capture may fail, continue without
        }
      }

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 8_000_000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        update({ isExporting: false, exportProgress: 100 });
        resolve(url);
      };

      const clipDuration = state.trimEnd - state.trimStart;
      v.currentTime = state.trimStart;
      v.playbackRate = state.speed;
      v.muted = state.isMuted;

      const progressInterval = setInterval(() => {
        if (v.currentTime >= state.trimStart) {
          const prog = ((v.currentTime - state.trimStart) / clipDuration) * 100;
          update({ exportProgress: Math.min(95, prog) });
        }
      }, 200);

      v.onplay = () => recorder.start();
      const checkEnd = () => {
        if (v.currentTime >= state.trimEnd - 0.1) {
          v.pause();
          v.removeEventListener("timeupdate", checkEnd);
          clearInterval(progressInterval);
          setTimeout(() => recorder.stop(), 300);
        }
      };
      v.addEventListener("timeupdate", checkEnd);
      v.play();
    });
  }, [state.trimStart, state.trimEnd, state.speed, state.isMuted, update]);

  const reset = useCallback(() => {
    if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
    setState(initialState);
  }, [state.videoUrl]);

  return {
    state,
    update,
    loadVideo,
    togglePlay,
    seek,
    exportClip,
    reset,
    videoRef,
    canvasRef,
    onVideoLoaded,
  };
}
