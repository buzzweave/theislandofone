import { useState } from "react";
import { Play } from "lucide-react";
import { videos } from "@/data/content";

const categories = ["All", ...Array.from(new Set(videos.map((v) => v.category)))];

export default function Videos() {
  const [activeCategory, setActiveCategory] = useState("All");
  const filtered = activeCategory === "All" ? videos : videos.filter((v) => v.category === activeCategory);

  return (
    <div className="min-h-screen">
      <section className="py-20 bg-gradient-section">
        <div className="container mx-auto px-4 text-center">
          <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">Watch</p>
          <h1 className="font-display text-5xl md:text-6xl font-bold mb-4">Videos</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Messages, teachings, and behind-the-scenes content from the ministry.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
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
          {filtered.map((video) => (
            <div
              key={video.id}
              className="group rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all duration-300 cursor-pointer"
            >
              <div className="relative aspect-video overflow-hidden">
                <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
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
              <div className="p-4">
                <p className="text-xs text-primary uppercase tracking-wider mb-1">{video.category}</p>
                <h3 className="font-display text-sm font-semibold group-hover:text-primary transition-colors">{video.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
