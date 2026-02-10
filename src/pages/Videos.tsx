import { useState } from "react";
import { Play, Facebook, Twitter, Link2, X } from "lucide-react";
import { useVideos } from "@/hooks/useVideos";
import { useToast } from "@/hooks/use-toast";

function getYouTubeId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/))([^?&/]+)/);
  return match ? match[1] : "";
}

export default function Videos() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { data: videos = [], isLoading } = useVideos();

  const categories = ["All", ...Array.from(new Set(videos.map((v) => v.category)))];
  const filtered = activeCategory === "All" ? videos : videos.filter((v) => v.category === activeCategory);

  const shareVideo = (title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied", description: `Share link for "${title}" copied.` });
  };

  return (
    <div className="min-h-screen">
      <section className="py-14 sm:py-20 bg-gradient-section">
        <div className="container mx-auto px-4 text-center">
          <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">Watch</p>
          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold mb-4">Videos</h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            Messages, teachings, and behind-the-scenes content from the ministry.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">Loading videos...</p>
        ) : videos.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No videos yet.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 justify-center mb-12">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto pb-24">
              {filtered.map((video) => {
                const ytId = getYouTubeId(video.youtube_url);
                const thumb = video.thumbnail || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : "");
                const isPlaying = playingId === video.id;

                return (
                  <div
                    key={video.id}
                    className="group rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="relative aspect-video overflow-hidden">
                      {isPlaying && ytId ? (
                        <>
                          <iframe
                            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                            title={video.title}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                          <button
                            onClick={() => setPlayingId(null)}
                            className="absolute top-2 right-2 z-10 p-1 rounded-full bg-background/80 text-foreground hover:bg-background transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <div className="cursor-pointer" onClick={() => ytId && setPlayingId(video.id)}>
                          {thumb ? (
                            <img src={thumb} alt={video.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Play className="h-10 w-10 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                              <Play className="h-6 w-6 text-primary-foreground ml-0.5" />
                            </div>
                          </div>
                          <span className="absolute bottom-2 right-2 text-xs bg-background/80 px-2 py-0.5 rounded text-foreground">{video.duration}</span>
                          {video.featured && (
                            <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold">
                              Featured
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-primary uppercase tracking-wider mb-1">{video.category}</p>
                      <h3 className="font-display text-sm font-semibold group-hover:text-primary transition-colors mb-2">{video.title}</h3>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(video.youtube_url || window.location.href)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                        >
                          <Facebook className="h-3 w-3" />
                        </a>
                        <a
                          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(video.title)}&url=${encodeURIComponent(video.youtube_url || window.location.href)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                        >
                          <Twitter className="h-3 w-3" />
                        </a>
                        <button
                          onClick={(e) => shareVideo(video.title, e)}
                          className="p-1.5 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                        >
                          <Link2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
