import { useState } from "react";
import { Loader2, ExternalLink, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getYouTubeId,
  isYouTubeUrl,
  toYouTubeEmbed,
  toYouTubeWatchUrl,
  getYouTubeThumbnail,
} from "@/lib/youtube";

interface Props {
  url?: string | null;
  title?: string;
  poster?: string | null;
  /** Autoplay after user taps play. Default true. */
  autoplayOnClick?: boolean;
  /** Start muted. Default false. */
  muted?: boolean;
  className?: string;
}

/**
 * Responsive 16:9 video player that:
 *  - accepts any YouTube URL format (converts to /embed automatically)
 *  - falls back to a native <video> for direct MP4/WebM/MOV links
 *  - shows a Play overlay and only loads the iframe on tap (avoids autoplay blockers)
 *  - shows an "Invalid video URL" state instead of crashing
 *  - shows a "Watch on YouTube" fallback if the embed fails
 */
export default function YouTubePlayer({
  url,
  title = "Video",
  poster,
  autoplayOnClick = true,
  muted = false,
  className = "",
}: Props) {
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);

  if (!url || !url.trim()) {
    return (
      <div className={`relative w-full aspect-video bg-black/80 flex items-center justify-center text-white/70 text-sm ${className}`}>
        No video URL
      </div>
    );
  }

  const isDirect = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
  const isYouTube = isYouTubeUrl(url);
  const embed = isYouTube
    ? toYouTubeEmbed(url, { autoplay: autoplayOnClick, muted, controls: true })
    : null;
  const watchUrl = toYouTubeWatchUrl(url);
  const thumb = poster || (isYouTube ? getYouTubeThumbnail(url, "max") : null);

  if (!isDirect && !isYouTube) {
    return (
      <div className={`relative w-full aspect-video bg-black/80 flex flex-col items-center justify-center text-white text-sm gap-2 ${className}`}>
        <span className="opacity-80">Invalid YouTube URL</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">
          Open link
        </a>
      </div>
    );
  }

  return (
    <div className={`relative w-full aspect-video bg-black overflow-hidden ${className}`}>
      {/* Poster + Play overlay */}
      {!playing && (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="absolute inset-0 z-10 flex items-center justify-center group"
          aria-label="Play video"
        >
          {thumb ? (
            <img
              src={thumb}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                // maxresdefault often 404s — fall back to hqdefault
                const img = e.currentTarget;
                if (isYouTube && !img.dataset.fallback) {
                  img.dataset.fallback = "1";
                  const hq = getYouTubeThumbnail(url, "hq");
                  if (hq) img.src = hq;
                }
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-black to-neutral-900" />
          )}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition" />
          <PlayCircle className="relative h-16 w-16 md:h-20 md:w-20 text-white drop-shadow-lg group-hover:scale-105 transition-transform" />
        </button>
      )}

      {/* Loading spinner while iframe loads */}
      {playing && !loaded && !embedFailed && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 pointer-events-none">
          <Loader2 className="h-8 w-8 animate-spin text-white/80" />
        </div>
      )}

      {/* Player */}
      {playing && !embedFailed && (
        isYouTube && embed ? (
          <iframe
            key={embed}
            src={embed}
            title={title}
            className="absolute inset-0 h-full w-full"
            style={{ border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setLoaded(true)}
            onError={() => setEmbedFailed(true)}
          />
        ) : (
          <video
            key={url}
            src={url}
            controls
            autoPlay={autoplayOnClick}
            muted={muted}
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-contain bg-black"
            onLoadedData={() => setLoaded(true)}
            onError={() => setEmbedFailed(true)}
          />
        )
      )}

      {/* Embed-blocked fallback */}
      {embedFailed && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black text-white gap-3 p-6 text-center">
          <p className="text-sm md:text-base opacity-90">
            This video cannot be embedded here.
          </p>
          {watchUrl ? (
            <Button asChild variant="secondary">
              <a href={watchUrl} target="_blank" rel="noopener noreferrer">
                Watch on YouTube <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          ) : (
            <Button asChild variant="secondary">
              <a href={url} target="_blank" rel="noopener noreferrer">
                Open video <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export { getYouTubeId };
