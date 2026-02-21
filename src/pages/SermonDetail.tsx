import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { membershipPlans } from "@/data/content";
import { useSermon } from "@/hooks/useSermons";
import { useAuth } from "@/contexts/AuthContext";
import { getTierByProductId, tierHasAccess } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SocialShareLinks from "@/components/SocialShareLinks";
import AudioPlayer from "@/components/AudioPlayer";
import CommentsWithRating from "@/components/CommentsWithRating";
import DOMPurify from "dompurify";
import {
  exportSermonToPdf,
  exportSermonToEpub,
  exportSermonToWord,
  exportSermonToGoodNotesPdf,
} from "@/lib/sermonExport";
import { toast } from "sonner";

import {
  ArrowLeft,
  Lock,
  Eye,
  ShoppingCart,
  Download,
  FileText,
  BookOpen,
  FileDown,
  CheckCircle2,
  Crown,
  Tablet,
  Loader2,
} from "lucide-react";

function safeDateLabel(value: any) {
  try {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

export default function SermonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sermon, isLoading } = useSermon(id);
  const { user, isSubscribed, subscription, checkPurchase } = useAuth();

  const [purchased, setPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Check purchase status on load (for non-free sermons)
  useEffect(() => {
    let active = true;

    async function run() {
      if (!user || !id || !sermon || (sermon as any).is_free) return;

      setCheckingPurchase(true);
      try {
        const result = await checkPurchase("sermon", id);
        if (active) setPurchased(!!result);
      } catch {
        if (active) setPurchased(false);
      } finally {
        if (active) setCheckingPurchase(false);
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [user, id, sermon, checkPurchase]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading sermon…</p>
      </div>
    );
  }

  if (!sermon) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Sermon not found.</p>
          <Button variant="outline" onClick={() => navigate("/sermons")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Library
          </Button>
        </div>
      </div>
    );
  }

  // Safe defaults (supports multiple possible sermon body fields)
  const manuscriptRaw = String(
    (sermon as any).manuscript ?? (sermon as any).content ?? (sermon as any).content_html ?? "",
  );
  const previewCutoff = Number((sermon as any).preview_cutoff ?? 0);

  const paragraphs = useMemo(() => {
    const parts = manuscriptRaw
      .split(/\n\s*\n/g)
      .map((p) => p.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : [manuscriptRaw];
  }, [manuscriptRaw]);

  const previewParagraphs = useMemo(() => {
    const cutoff = Number.isFinite(previewCutoff) ? previewCutoff : 0;
    const safeCutoff = Math.max(0, Math.min(cutoff + 1, paragraphs.length));
    return paragraphs.slice(0, safeCutoff);
  }, [previewCutoff, paragraphs]);

  // Tier access
  const productId = (subscription as any)?.product_id ?? null;
  const userTier = productId ? getTierByProductId(productId) : null;

  const accessTiers = (sermon as any).access_tiers ?? [];
  const accessLevel = (sermon as any).access_level ?? "free";

  const tierAccess = useMemo(() => {
    try {
      if (Array.isArray(accessTiers) && accessTiers.length > 0) {
        return userTier ? tierHasAccess(userTier, accessTiers) : false;
      }
      if (!userTier) return false;
      return tierHasAccess(userTier, accessLevel);
    } catch {
      return false;
    }
  }, [userTier, accessTiers, accessLevel]);

  const isFullAccess = Boolean((sermon as any).is_free || purchased || isSubscribed || tierAccess);

  const handlePurchase = async () => {
    if (!id) return;

    if (!user) {
      navigate("/auth", { state: { from: `/sermons/${id}` } });
      return;
    }

    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          type: "sermon",
          itemId: id,
          priceAmount: (sermon as any).price,
          itemTitle: (sermon as any).title,
        },
      });

      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
      else toast.error("Checkout link not returned.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleDownload = (format: string) => {
    if (!isFullAccess) {
      toast.error("You must unlock this sermon to download.");
      return;
    }
    if (format === "PDF") exportSermonToPdf(sermon as any);
    else if (format === "EPUB") exportSermonToEpub(sermon as any);
    else if (format === "Word") exportSermonToWord(sermon as any);
    else if (format === "GoodNotes") exportSermonToGoodNotesPdf(sermon as any);
  };

  const renderContent = (content: string) => {
    const isHtml = content?.includes("<") && content?.includes(">");
    if (isHtml) {
      return (
        <div
          className="sermon-flow [&_*]:!text-foreground"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      );
    }
    return <div className="sermon-flow whitespace-pre-wrap">{content}</div>;
  };

  const dateLabel = safeDateLabel((sermon as any).date);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="py-16 bg-gradient-section">
        <div className="container mx-auto px-4">
          <button
            onClick={() => navigate("/sermons")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Sermon Library
          </button>

          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {(sermon as any).category}
              </span>

              {!(sermon as any).is_free && !isFullAccess && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Lock className="h-2.5 w-2.5" /> {String(accessLevel)}
                </span>
              )}

              {(sermon as any).is_free && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/5 text-primary/70 border border-primary/10">
                  Free
                </span>
              )}

              {checkingPurchase && (
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Checking access…
                </span>
              )}
            </div>

            <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">{(sermon as any).title}</h1>
            <p className="text-lg text-primary/80 mb-2">{(sermon as any).scripture}</p>
            <p className="text-muted-foreground">{(sermon as any).excerpt}</p>

            {dateLabel ? (
              <p className="text-sm text-muted-foreground mt-3 mb-4">
                Published {dateLabel} {" · "}By Bryant Clark
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-3 mb-4">By Bryant Clark</p>
            )}

            <SocialShareLinks title={(sermon as any).title} url={`https://theislandofone.com/share/sermon/${id}`} />

            {isFullAccess && (sermon as any).audio_url && (
              <div className="mt-6">
                <AudioPlayer audioUrl={(sermon as any).audio_url} title={(sermon as any).title} />
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto grid lg:grid-cols-[1fr_300px] gap-8">
          {/* Manuscript */}
          <div>
            <div className="mb-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <Eye className="h-3.5 w-3.5" />
                {isFullAccess ? "Full Manuscript" : "Preview"}
              </div>
            </div>

            <article className="sermon-flow max-w-none">
              {(isFullAccess ? paragraphs : previewParagraphs).map((p, i) => (
                <div key={i}>{renderContent(p)}</div>
              ))}
            </article>

            <p className="mt-8 text-xs text-muted-foreground text-center">
              © {new Date().getFullYear()} The Island of One Ministries. All rights reserved. For personal use only.
            </p>

            {!isFullAccess && (
              <div className="relative mt-0">
                <div className="absolute inset-x-0 -top-32 h-32 bg-gradient-to-b from-transparent to-background pointer-events-none" />
                <div className="pt-8 pb-4 text-center space-y-4">
                  <Lock className="h-8 w-8 text-primary mx-auto" />
                  <p className="font-display text-xl font-semibold">Continue Reading</p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Purchase this sermon to read the full manuscript and download in PDF, EPUB, or Word format.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button size="lg" onClick={handlePurchase} disabled={checkoutLoading}>
                      {checkoutLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ShoppingCart className="h-4 w-4 mr-2" />
                      )}
                      Buy for ${Number((sermon as any).price ?? 0).toFixed(2)}
                    </Button>

                    <Button variant="outline" size="lg" asChild>
                      <Link to="/membership">
                        <Crown className="h-4 w-4 mr-2" />
                        Subscribe &amp; Get All
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {isFullAccess && (
              <div className="mt-12 pt-8 border-t border-border">
                <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  Download This Sermon
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { format: "GoodNotes", icon: Tablet, desc: "iPad pulpit format (A4)" },
                    { format: "PDF", icon: FileText, desc: "Print-ready pulpit format" },
                    { format: "EPUB", icon: BookOpen, desc: "Kindle compatible" },
                    { format: "Word", icon: FileDown, desc: "Editable pulpit format" },
                  ].map(({ format, icon: Icon, desc }) => (
                    <button
                      key={format}
                      onClick={() => handleDownload(format)}
                      className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-card/80 transition-all group"
                    >
                      <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <div className="text-left">
                        <p className="text-sm font-medium">{format}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {!isFullAccess && (
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-lg">Get This Sermon</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold text-primary">
                    ${Number((sermon as any).price ?? 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">One-time purchase. Download in PDF, EPUB, and Word.</p>
                  <Button className="w-full" onClick={handlePurchase} disabled={checkoutLoading}>
                    {checkoutLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 mr-2" />
                    )}
                    Purchase
                  </Button>
                  <div className="text-center">
                    <span className="text-xs text-muted-foreground">or</span>
                  </div>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/membership">
                      <Crown className="h-4 w-4 mr-2" /> Subscribe from $9.99/mo
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {isFullAccess && !(sermon as any).is_free && (
              <Card className="border-primary/30">
                <CardContent className="pt-6 text-center space-y-3">
                  <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
                  <p className="font-display text-lg font-semibold">
                    {isSubscribed ? "Subscriber Access" : "Purchased!"}
                  </p>
                  <p className="text-xs text-muted-foreground">Full manuscript unlocked. Download below.</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="pt-6 space-y-3">
                <Crown className="h-6 w-6 text-primary" />
                <p className="font-display text-sm font-semibold">Unlock All Sermons</p>
                <p className="text-xs text-muted-foreground">
                  Subscribe to get unlimited access to our entire sermon library plus exclusive resources.
                </p>
                <div className="space-y-1.5">
                  {membershipPlans.slice(0, 2).map((plan) => (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between text-xs p-2 rounded bg-secondary/30"
                    >
                      <span className="font-medium">{plan.name}</span>
                      <span className="text-primary font-semibold">${plan.price}/mo</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to="/membership">View Plans</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="max-w-3xl mx-auto mt-8 pt-6 border-t border-border">
          <CommentsWithRating contentType="sermon" contentId={id!} />
        </div>
      </div>
    </div>
  );
}
