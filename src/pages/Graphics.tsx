import { useState, useEffect, useCallback } from "react";
import { useGraphics, Graphic } from "@/hooks/useGraphics";
import { ShoppingCart, Image, Crown, Search, Download } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAuth } from "@/contexts/AuthContext";
import { getTierByProductId } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

export default function Graphics() {
  const { graphics, isLoading } = useGraphics();
  const { toast } = useToast();
  const { value: watermarkUrl } = useSiteSettings("watermark_url");
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const { user, subscription, checkPurchase } = useAuth();
  const navigate = useNavigate();
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [loadingPurchaseId, setLoadingPurchaseId] = useState<string | null>(null);

  const isInnerCircle = getTierByProductId(subscription.product_id) === "inner-circle";

  // Check which graphics the user has purchased
  const loadPurchases = useCallback(async () => {
    if (!user || isInnerCircle) return;
    const ids = new Set<string>();
    for (const g of graphics) {
      const purchased = await checkPurchase("graphic", g.id);
      if (purchased) ids.add(g.id);
    }
    setPurchasedIds(ids);
  }, [user, graphics, checkPurchase, isInnerCircle]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const categories = ["All", ...Array.from(new Set(graphics.map((g) => g.category)))];
  const filtered = graphics.filter((g) => {
    const matchesCategory = activeCategory === "All" || g.category === activeCategory;
    const matchesSearch = g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const hasAccess = (graphicId: string) => isInnerCircle || purchasedIds.has(graphicId);

  const handleBuy = async (graphic: Graphic) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setLoadingPurchaseId(graphic.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          type: "graphic",
          itemId: graphic.id,
          priceAmount: graphic.price,
          itemTitle: graphic.title,
        },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not start checkout", variant: "destructive" });
    } finally {
      setLoadingPurchaseId(null);
    }
  };

  return (
    <div className="min-h-screen">
      <section className="py-14 sm:py-20 bg-gradient-section">
        <div className="container mx-auto px-4 text-center">
          <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">Church Media</p>
          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold mb-4">Graphics</h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto mb-6">
            Professional graphics for your church screens, social media, and print. Purchase individually or get unlimited access with Inner Circle membership.
          </p>
          <Link
            to="/membership"
            className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-semibold hover:bg-primary/20 transition-colors"
          >
            <Crown className="h-4 w-4" /> Inner Circle: Unlimited Downloads
          </Link>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Search + filters */}
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
              const unlocked = hasAccess(graphic.id);
              return (
                <div
                  key={graphic.id}
                  className="group rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all duration-300"
                >
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    <img
                      src={graphic.preview_url}
                      alt={graphic.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {watermarkUrl && !unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <img
                          src={watermarkUrl}
                          alt=""
                          className="w-2/3 h-2/3 object-contain opacity-40 select-none"
                          draggable={false}
                        />
                      </div>
                    )}
                    {isInnerCircle && (
                      <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold">
                        <Crown className="h-2.5 w-2.5 inline mr-1" />Included
                      </span>
                    )}
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
                      <span className="text-lg font-bold text-primary">
                        {unlocked ? "Owned" : `$${graphic.price}`}
                      </span>
                      {unlocked ? (
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
                          disabled={loadingPurchaseId === graphic.id}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors disabled:opacity-50"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          {loadingPurchaseId === graphic.id ? "…" : "Buy"}
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
