import { useState, useEffect } from "react";
import { useGraphics } from "@/hooks/useGraphics";
import { useAuth } from "@/contexts/AuthContext";
import { getTierByProductId, tierHasAccess, MEMBERSHIP_TIERS } from "@/lib/stripe";
import { Image, Search, Download, ShoppingCart, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import GraphicsFolders from "@/components/graphics/GraphicsFolders";

export default function Graphics() {
  const { graphics, isLoading } = useGraphics();
  const { subscription, user, checkPurchase } = useAuth();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const userTier = getTierByProductId(subscription.product_id);

  // Check purchases for all paid graphics
  useEffect(() => {
    if (!user) { setPurchasedIds(new Set()); return; }
    const paidGraphics = graphics.filter((g) => g.price && g.price > 0);
    if (paidGraphics.length === 0) return;

    Promise.all(
      paidGraphics.map((g) => checkPurchase("graphic", g.id).then((ok) => (ok ? g.id : null)))
    ).then((results) => {
      setPurchasedIds(new Set(results.filter(Boolean) as string[]));
    });
  }, [user, graphics, checkPurchase]);

  const categories = ["All", ...Array.from(new Set(graphics.map((g) => g.category)))];
  const filtered = graphics.filter((g) => {
    const matchesCategory = activeCategory === "All" || g.category === activeCategory;
    const lq = searchQuery.toLowerCase();
    const matchesSearch = g.title.toLowerCase().includes(lq) ||
      (g.description || "").toLowerCase().includes(lq);
    return matchesCategory && matchesSearch;
  });

  // Pagination for performance
  const PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleGraphics = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const handleBuy = async (graphic: typeof graphics[0]) => {
    setBuyingId(graphic.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please sign in to purchase", variant: "destructive" });
        setBuyingId(null);
        return;
      }
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { type: "graphic", itemId: graphic.id, priceAmount: graphic.price, itemTitle: graphic.title },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    }
    setBuyingId(null);
  };

  // Helper to get the minimum tier label for a graphic
  const getTierLabel = (accessTiers: string[]) => {
    if (!accessTiers || accessTiers.length === 0) return null;
    const tierRank: Record<string, number> = { reader: 1, pastor: 2, "inner-circle": 3 };
    const sorted = [...accessTiers].sort((a, b) => (tierRank[a] || 99) - (tierRank[b] || 99));
    const slug = sorted[0];
    const tier = MEMBERSHIP_TIERS[slug as keyof typeof MEMBERSHIP_TIERS];
    return tier ? tier.name : slug;
  };

  return (
    <div className="min-h-screen">
      <section className="py-14 sm:py-20 bg-gradient-section">
        <div className="container mx-auto px-4 text-center">
          <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">Church Media</p>
          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold mb-4">Graphics</h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            Free professional graphics for your church screens, social media, and print.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto mb-8 space-y-4">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search graphics…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary/40"
            />
          </div>
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
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Loading graphics…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No graphics found. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto pb-24">
            {filtered.map((graphic) => {
              const isFree = !graphic.price || graphic.price === 0;
              const hasTierAccess = tierHasAccess(userTier, graphic.access_tiers);
              const hasPurchased = purchasedIds.has(graphic.id);
              const canDownload = isFree || hasTierAccess || hasPurchased;
              const tierLabel = !isFree && hasTierAccess ? getTierLabel(graphic.access_tiers) : null;

              return (
                <div
                  key={graphic.id}
                  className="group rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all duration-300"
                >
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    <img
                      src={graphic.preview_url}
                      alt={graphic.title}
                      loading="lazy"
                      decoding="async"
                      fetchPriority={filtered.indexOf(graphic) < 3 ? "high" : "low"}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                      <span className="text-white/20 font-display text-lg sm:text-xl font-bold rotate-[-25deg] whitespace-nowrap">
                        The Island of One
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-xs text-primary uppercase tracking-wider mb-1">{graphic.category}</p>
                      <h3 className="font-display text-sm font-semibold group-hover:text-primary transition-colors">
                        {graphic.title}
                      </h3>
                      {graphic.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{graphic.description}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">
                          {isFree ? "Free" : `$${Number(graphic.price).toFixed(2)}`}
                        </span>
                        {tierLabel && (
                          <Badge variant="secondary" className="text-[10px]">
                            Included with {tierLabel}
                          </Badge>
                        )}
                      </div>
                      {canDownload ? (
                        <a
                          href={graphic.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" /> Download
                        </a>
                      ) : (
                        <button
                          onClick={() => handleBuy(graphic)}
                          disabled={buyingId === graphic.id}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          {buyingId === graphic.id ? "Processing…" : "Buy Now"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
