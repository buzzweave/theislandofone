import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Lock, Eye, ShoppingCart } from "lucide-react";
import { useSermons } from "@/hooks/useSermons";

const accessFilters = ["All", "free", "member", "pastor", "inner_circle"];

function formatAccessLabel(level?: string) {
  if (!level) return "Members";
  if (level === "free") return "Free";
  if (level === "member") return "Members";
  if (level === "pastor") return "Pastor";
  if (level === "inner_circle") return "Inner Circle";
  return level.replace(/_/g, " ");
}

export default function Sermons() {
  const { data: sermons = [], isLoading } = useSermons();
  const categories = ["All", ...Array.from(new Set(sermons.map((s: any) => s.category).filter(Boolean)))];
  const [activeCategory, setActiveCategory] = useState("All");
  const [accessFilter, setAccessFilter] = useState("All");

  const filtered = sermons.filter((s: any) => {
    if (s.is_published === false) return false;
    if (activeCategory !== "All" && s.category !== activeCategory) return false;
    if (accessFilter !== "All" && (s.access_level ?? "free") !== accessFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen">
      <section className="py-14 sm:py-20 bg-gradient-section">
        <div className="container mx-auto px-4 text-center">
          <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">For Pastors</p>
          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold mb-4">Sermon Library</h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            Ready-to-preach manuscripts, outlines, and inspiration for your ministry.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {accessFilters.map((af) => (
              <button
                key={af}
                onClick={() => setAccessFilter(af)}
                className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider transition-colors ${
                  accessFilter === af
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {af === "All" ? "All Access" : formatAccessLabel(af)}
              </button>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="max-w-3xl mx-auto mb-10 p-4 rounded-lg border border-border bg-card text-sm text-muted-foreground text-center">
          <BookOpen className="h-4 w-4 inline mr-2 text-primary" />
          These sermons are provided as a resource for pastors. Please adapt them for your congregation and give
          appropriate credit.
        </div>

        {isLoading && <p className="text-center text-muted-foreground animate-pulse">Loading sermons…</p>}

        {/* Sermons List */}
        <div className="max-w-3xl mx-auto space-y-4 pb-24">
          {filtered.map((sermon: any) => {
            const accessLevel = sermon.access_level ?? "free";
            const priceNum = Number(sermon.price ?? 0);

            // Treat anything not explicitly free as locked.
            // If you want ONLY price-based locking, tell me and I’ll adjust.
            const isFree = accessLevel === "free" || sermon.is_free === true;
            const hasPrice = priceNum > 0;
            const isLocked = !isFree;

            return (
              <Link
                key={sermon.id}
                to={`/sermons/${sermon.id}`}
                className="group block p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                        {sermon.category}
                      </span>

                      {/* Primary badge */}
                      {isFree ? (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/5 text-primary/70 border border-primary/10">
                          Free
                        </span>
                      ) : hasPrice ? (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          <Lock className="h-2.5 w-2.5" /> ${priceNum.toFixed(2)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          <Lock className="h-2.5 w-2.5" /> {formatAccessLabel(accessLevel)}
                        </span>
                      )}

                      {/* Secondary label (optional) */}
                      {!isFree && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                          {formatAccessLabel(accessLevel)}
                        </span>
                      )}
                    </div>

                    <h3 className="font-display text-xl font-semibold mb-1 group-hover:text-primary transition-colors">
                      {sermon.title}
                    </h3>

                    <p className="text-sm text-primary/80 mb-2">{sermon.scripture}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{sermon.excerpt}</p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{sermon.date}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                      {isFree ? (
                        <>
                          <Eye className="h-3 w-3" /> Read
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-3 w-3" /> {isLocked ? "Preview" : "Read"}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {filtered.length === 0 && !isLoading && (
            <p className="text-center text-muted-foreground py-12">No sermons match your filters.</p>
          )}
        </div>
      </div>
    </div>
  );
}
