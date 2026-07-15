// YouTube URL helpers
const YT_RE = /(?:youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/;

export function getYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(YT_RE);
  return m ? m[1] : null;
}

export function isYouTubeUrl(url?: string | null): boolean {
  return !!getYouTubeId(url);
}

/** Returns an embed URL suitable for an <iframe>, or null if not YouTube. */
export function toYouTubeEmbed(
  url?: string | null,
  opts: { autoplay?: boolean; muted?: boolean; loop?: boolean; controls?: boolean } = {}
): string | null {
  const id = getYouTubeId(url);
  if (!id) return null;
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  if (opts.autoplay) params.set("autoplay", "1");
  if (opts.muted) params.set("mute", "1");
  if (opts.loop) {
    params.set("loop", "1");
    params.set("playlist", id);
  }
  if (opts.controls === false) params.set("controls", "0");
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}
