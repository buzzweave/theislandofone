// YouTube URL helpers — robust parser covering every share format we've seen.
// Handles:
//   https://youtu.be/ID
//   https://youtu.be/ID?si=…&t=30
//   https://www.youtube.com/watch?v=ID
//   https://www.youtube.com/watch?v=ID&t=30s&list=…&feature=share
//   https://m.youtube.com/watch?v=ID
//   https://youtube.com/watch?v=ID
//   https://www.youtube.com/embed/ID
//   https://www.youtube.com/v/ID
//   https://www.youtube.com/live/ID
//   https://www.youtube.com/shorts/ID
//   https://www.youtube-nocookie.com/embed/ID
//   https://www.youtube.com/attribution_link?a=…&u=/watch?v=ID
//   Bare 11-char video IDs

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function getYouTubeId(input?: string | null): string | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  // Already an ID
  if (ID_RE.test(raw)) return raw;

  // Try URL parsing first (handles query params cleanly)
  try {
    // Support attribution_link where the target url lives in ?u=
    const url = new URL(raw, "https://youtube.com");
    const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      if (id && ID_RE.test(id)) return id;
    }

    if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "music.youtube.com") {
      // /watch?v=ID
      const v = url.searchParams.get("v");
      if (v && ID_RE.test(v)) return v;

      // attribution_link
      const u = url.searchParams.get("u");
      if (u) {
        const nested = getYouTubeId(decodeURIComponent(u));
        if (nested) return nested;
      }

      // /embed/ID, /v/ID, /live/ID, /shorts/ID, /e/ID
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && /^(embed|v|e|live|shorts)$/i.test(parts[0])) {
        if (ID_RE.test(parts[1])) return parts[1];
      }
    }
  } catch {
    /* fall through to regex */
  }

  // Regex fallback for anything URL parser missed
  const m = raw.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^&]+&)*v=|embed\/|v\/|e\/|live\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

export function isYouTubeUrl(url?: string | null): boolean {
  return !!getYouTubeId(url);
}

/** Returns an /embed URL for an <iframe>, or null if not YouTube. */
export function toYouTubeEmbed(
  url?: string | null,
  opts: {
    autoplay?: boolean;
    muted?: boolean;
    loop?: boolean;
    controls?: boolean;
    start?: number;
  } = {}
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
  if (opts.start && opts.start > 0) params.set("start", String(Math.floor(opts.start)));
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

/** Canonical https://youtu.be/ID link for "Watch on YouTube" fallbacks. */
export function toYouTubeWatchUrl(url?: string | null): string | null {
  const id = getYouTubeId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

/** hqdefault thumbnail — handy for card fallbacks. */
export function getYouTubeThumbnail(url?: string | null, quality: "default" | "mq" | "hq" | "sd" | "max" = "hq"): string | null {
  const id = getYouTubeId(url);
  if (!id) return null;
  const map = { default: "default", mq: "mqdefault", hq: "hqdefault", sd: "sddefault", max: "maxresdefault" };
  return `https://img.youtube.com/vi/${id}/${map[quality]}.jpg`;
}
