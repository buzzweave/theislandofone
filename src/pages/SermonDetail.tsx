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
      if (!user || !id || !sermon || sermon.is_free) return;

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

  // Safe defaults
  const manuscriptRaw = String((sermon as any).manuscript ?? (sermon as any).content ?? (sermon as any).content_html ?? "");
  const previewCutoff = Number((sermon as any).preview_cutoff ?? 0);

  const paragraphs = useMemo(() => {
    // Split by blank line; fall back to single block if no blank lines
    const parts = manuscriptRaw.split(/\n\s*\n/g).map((p) => p.trim()).filter(Boolean);
    return parts.length > 0 ? parts : [manuscriptRaw];
  }, [manuscriptRaw]);

  const previewParagraphs = useMemo(() => {
    const cutoff = Number.isFinite(previewCutoff) ? previewCutoff : 0;
    const safeCutoff = Math.max(0, Math.min(cutoff + 1, paragraphs.length));
    return paragraphs.slice(0, safeCutoff);
  }, [previewCutoff, paragraphs]);

  // Tier access
  const productId = (subscription as any)?.product_id;
  const userTier = productId ? getTierByProductId(productId) : null;

  // access_tiers may be stored as array; fallback to access_level (string)
  const accessTiers = (sermon as any).access_tiers ?? [];
  const accessLevel = (sermon as any).access_level ?? "free";

  const tierAccess = useMemo(() => {
    try {
      // If access_tiers is an array of tiers, use it.
      if (Array.isArray(accessTiers) && accessTiers.length > 0) {
        return userTier ? tierHasAccess(userTier, accessTiers) : false;
      }
      // Otherwise, allow by access_level (free/member/pastor/inner_circle)
      if (!userTier) return false;
      return tierHasAccess(userTier, accessLevel);
    } catch {
      return false;
    }
  }, [userTier, accessTiers, accessLevel]);

  const isFullAccess = Boolean(sermon.is_free || purchased || isSubscribed || tierAccess);

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
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">{(sermon as any).category}</span>

              {!sermon.is_free && !isFullAccess && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Lock className="h-2.5 w-2.5" /> {accessLevel}
                </span>
              )}

              {sermon.is_free && (
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

            <p className="text-sm text-muted-foreground mt-3 mb-4">
              Published{" "}
              {new Date((sermon as any).date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {" · "}By Bryant Clark
            </p>

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
                        Subscribe & Get All
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
                  <div className="text-3xl font-bold text-primary">${Number((sermon as any).price ?? 0).toFixed(2)}</div>
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

            {isFullAccess && !sermon.is_free && (
              <Card className="border-primary/30">
                <CardContent className="pt-6 text-center space-y-3">
                  <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
                  <p className="font-display text-lg font-semibold">{isSubscribed ? "Subscriber Access" : "Purchased!"}</p>
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
                    <div key={plan.id} className="flex items-center justify-between text-xs p-2 rounded bg-secondary/30">
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

function formatAccessLabel(level?: string) {
  if (!level) return "Members";
  if (level === "free") return "Free";
  if (level === "member") return "Members";
  if (level === "pastor") return "Pastor";
  if (level === "inner_circle") return "Inner Circle";
  return String(level).replace(/_/g, " ");
}

export default function SermonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sermon, isLoading } = useSermon(id);
  const { user, isSubscribed, subscription, checkPurchase } = useAuth();

  const [hasPurchased, setHasPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(false);
  const [downloading, setDownloading] = useState<null | "pdf" | "epub" | "word" | "goodnotes">(null);

  // Determine user tier from Stripe subscription (best-effort with common shapes)
  const productId = useMemo(() => {
    const s: any = subscription as any;
    return (
      s?.product_id ||
      s?.plan?.product ||
      s?.items?.data?.[0]?.plan?.product ||
      s?.subscription?.items?.data?.[0]?.plan?.product ||
      null
    );
  }, [subscription]);

  const userTier = useMemo(() => {
    if (!productId) return null;
    try {
      return getTierByProductId(String(productId));
    } catch {
      return null;
    }
  }, [productId]);

  // Compute access flags from sermon fields (supports multiple schema variations)
  const accessLevel = useMemo(() => {
    const s: any = sermon as any;
    return (s?.access_level ?? "free") as string;
  }, [sermon]);

  const priceNum = useMemo(() => {
    const s: any = sermon as any;
    const p = Number(s?.price ?? 0);
    return Number.isFinite(p) ? p : 0;
  }, [sermon]);

  const chargeEnabled = useMemo(() => {
    const s: any = sermon as any;
    // supports either charge_enabled or charge_for_sermon
    return Boolean(s?.charge_enabled ?? s?.charge_for_sermon ?? false);
  }, [sermon]);

  const isFree = useMemo(() => {
    const s: any = sermon as any;
    // supports is_free and access_level
    return Boolean(s?.is_free === true || accessLevel === "free");
  }, [sermon, accessLevel]);

  const isLockedSermon = useMemo(() => {
    // If explicitly free -> not locked.
    // Otherwise: locked if access_level not free OR price > 0 OR chargeEnabled true.
    if (isFree) return false;
    return accessLevel !== "free" || priceNum > 0 || chargeEnabled;
  }, [isFree, accessLevel, priceNum, chargeEnabled]);

  // Check one-off purchase (if your app supports purchases per sermon)
  useEffect(() => {
    let active = true;

    async function run() {
      if (!sermon?.id || !user || typeof checkPurchase !== "function") {
        if (active) setHasPurchased(false);
        return;
      }
      setCheckingPurchase(true);
      try {
        const ok = await checkPurchase((sermon as any).id);
        if (active) setHasPurchased(!!ok);
      } catch {
        if (active) setHasPurchased(false);
      } finally {
        if (active) setCheckingPurchase(false);
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [sermon?.id, user, checkPurchase]);

  // Tier entitlement check (uses your helper when available)
  const tierAllows = useMemo(() => {
    if (!userTier) return false;
    try {
      return tierHasAccess(userTier, accessLevel);
    } catch {
      // fallback: if subscribed and accessLevel is "member", allow
      return false;
    }
  }, [userTier, accessLevel]);

  const entitled = useMemo(() => {
    // Free sermons are always readable.
    if (!isLockedSermon) return true;

    // Must be logged in for anything locked
    if (!user) return false;

    // Purchased unlocks
    if (hasPurchased) return true;

    // Tier-based unlock
    if (tierAllows) return true;

    // Basic fallback: any subscription unlocks "member" level
    if (isSubscribed && accessLevel === "member") return true;

    return false;
  }, [isLockedSermon, user, hasPurchased, tierAllows, isSubscribed, accessLevel]);

  // Content rendering (HTML sanitized)
  const safeHtml = useMemo(() => {
    const s: any = sermon as any;
    const raw = s?.content_html ?? s?.content ?? s?.body ?? "";
    return DOMPurify.sanitize(String(raw), { USE_PROFILES: { html: true } });
  }, [sermon]);

  const excerptText = useMemo(() => {
    const s: any = sermon as any;
    return String(s?.excerpt ?? s?.summary ?? "").trim();
  }, [sermon]);

  async function handleDownload(kind: "pdf" | "epub" | "word" | "goodnotes") {
    if (!sermon) return;

    if (isLockedSermon && !entitled) {
      toast.error("This download is available to members.");
      return;
    }

    try {
      setDownloading(kind);

      // Best-effort “title” and “content” fields for exporters
      const s: any = sermon as any;
      const title = String(s?.title ?? "Sermon");
      const scripture = String(s?.scripture ?? "");
      const content = String(s?.content_html ?? s?.content ?? s?.body ?? "");

      if (kind === "pdf") {
        await exportSermonToPdf({ title, scripture, content });
        toast.success("PDF exported.");
      } else if (kind === "epub") {
        await exportSermonToEpub({ title, scripture, content });
        toast.success("EPUB exported.");
      } else if (kind === "word") {
        await exportSermonToWord({ title, scripture, content });
        toast.success("Word exported.");
      } else {
        await exportSermonToGoodNotesPdf({ title, scripture, content });
        toast.success("GoodNotes PDF exported.");
      }
    } catch (e: any) {
      toast.error(e?.message ? String(e.message) : "Export failed.");
    } finally {
      setDownloading(null);
    }
  }

  // ---------- LOADING ----------
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-16 max-w-3xl">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading sermon…
          </div>
        </div>
      </div>
    );
  }

  // ---------- NOT FOUND ----------
  if (!sermon) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-16 max-w-3xl">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="mt-10 text-muted-foreground">Sermon not found.</div>
        </div>
      </div>
    );
  }

  // ---------- PAYWALL VIEW (LOCKED + NOT ENTITLED) ----------
  if (isLockedSermon && !entitled) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-10 max-w-3xl">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Lock className="h-3 w-3 inline mr-1" />
              {priceNum > 0 ? `$${priceNum.toFixed(2)}` : formatAccessLabel(accessLevel)}
            </span>
            {checkingPurchase ? (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking access…
              </span>
            ) : null}
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-bold mb-3">{(sermon as any).title}</h1>
          {(sermon as any).scripture ? (
            <p className="text-sm text-primary/80 mb-6">{(sermon as any).scripture}</p>
          ) : null}

          {excerptText ? (
            <div className="text-base leading-relaxed text-muted-foreground whitespace-pre-wrap">{excerptText}</div>
          ) : (
            <p className="text-base leading-relaxed text-muted-foreground">
              This sermon is available to members. Join to unlock the full manuscript.
            </p>
          )}

          <div className="mt-8 p-6 rounded-xl border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Members Only</h3>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {priceNum > 0
                ? `Unlock this sermon for $${priceNum.toFixed(2)} or join a membership tier for access.`
                : `Join ${formatAccessLabel(accessLevel)} to unlock this sermon.`}
            </p>

            <div className="flex flex-wrap gap-3">
              {!user ? (
                <Button onClick={() => navigate("/login")} className="rounded-full">
                  Sign In
                </Button>
              ) : null}

              <Button onClick={() => navigate("/membership")} className="rounded-full">
                Join Membership
              </Button>

              <Button variant="outline" onClick={() => navigate("/sermons")} className="rounded-full">
                Browse Library
              </Button>
            </div>

            <div className="mt-6 text-xs text-muted-foreground">
              Tip: If you already joined, sign in with the same email you used for membership.
            </div>
          </div>

          <div className="mt-8">
            <SocialShareLinks title={(sermon as any).title} />
          </div>
        </div>
      </div>
    );
  }

  // ---------- FULL ACCESS VIEW ----------
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          <div className="flex items-center gap-2">
            {isLockedSermon ? (
              <span className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Access Granted
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border border-primary/10 bg-primary/5 text-primary/80">
                <Eye className="h-4 w-4" />
                Free
              </span>
            )}
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-display text-2xl sm:text-3xl">{(sermon as any).title}</CardTitle>
            {(sermon as any).scripture ? (
              <p className="text-sm text-primary/80 mt-2">{(sermon as any).scripture}</p>
            ) : null}
          </CardHeader>

          <CardContent>
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {(sermon as any).category ? (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {(sermon as any).category}
                </span>
              ) : null}
              {isLockedSermon ? (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Lock className="h-3 w-3 inline mr-1" />
                  {priceNum > 0 ? `$${priceNum.toFixed(2)}` : formatAccessLabel(accessLevel)}
                </span>
              ) : null}
              {(sermon as any).date ? (
                <span className="text-xs text-muted-foreground">{(sermon as any).date}</span>
              ) : null}
            </div>

            {/* CONTENT */}
            <div className="prose prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
            </div>

            {/* AUDIO (optional) */}
            {(sermon as any).audio_url ? (
              <div className="mt-10">
                <AudioPlayer src={(sermon as any).audio_url} title={(sermon as any).title} />
              </div>
            ) : null}

            {/* DOWNLOADS */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                onClick={() => handleDownload("pdf")}
                disabled={downloading !== null}
                className="w-full gap-2"
              >
                {downloading === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                PDF
              </Button>

              <Button
                onClick={() => handleDownload("goodnotes")}
                disabled={downloading !== null}
                variant="outline"
                className="w-full gap-2"
              >
                {downloading === "goodnotes" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tablet className="h-4 w-4" />}
                GoodNotes
              </Button>

              <Button
                onClick={() => handleDownload("word")}
                disabled={downloading !== null}
                variant="outline"
                className="w-full gap-2"
              >
                {downloading === "word" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Word
              </Button>

              <Button
                onClick={() => handleDownload("epub")}
                disabled={downloading !== null}
                variant="outline"
                className="w-full gap-2"
              >
                {downloading === "epub" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                EPUB
              </Button>
            </div>

            {/* SHARE */}
            <div className="mt-10">
              <SocialShareLinks title={(sermon as any).title} />
            </div>

            {/* COMMENTS */}
            <div className="mt-10">
              <CommentsWithRating contentType="sermon" contentId={(sermon as any).id} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}  const [purchased, setPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Check purchase status on load
  useEffect(() => {
    if (!user || !id || !sermon || sermon.is_free) return;
    setCheckingPurchase(true);
    checkPurchase("sermon", id).then((result) => {
      setPurchased(result);
      setCheckingPurchase(false);
    });
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

  const paragraphs = sermon.manuscript.split("\n\n");
  const previewParagraphs = paragraphs.slice(0, sermon.preview_cutoff + 1);
  const userTier = getTierByProductId(subscription.product_id);
  const tierAccess = tierHasAccess(userTier, (sermon as any).access_tiers || []);
  const isFullAccess = sermon.is_free || purchased || isSubscribed || tierAccess;

  const handlePurchase = async () => {
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
          priceAmount: sermon.price,
          itemTitle: sermon.title,
        },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleDownload = (format: string) => {
    if (format === "PDF") exportSermonToPdf(sermon);
    else if (format === "EPUB") exportSermonToEpub(sermon);
    else if (format === "Word") exportSermonToWord(sermon);
    else if (format === "GoodNotes") exportSermonToGoodNotesPdf(sermon);
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
    // EXACT PASTE MODE: render as-is with pre-wrap whitespace preservation
    return (
      <div className="sermon-flow">{content}</div>
    );
  };

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
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">{sermon.category}</span>
              {!sermon.is_free && !isFullAccess && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Lock className="h-2.5 w-2.5" /> {sermon.access_level}
                </span>
              )}
              {sermon.is_free && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/5 text-primary/70 border border-primary/10">
                  Free
                </span>
              )}
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">{sermon.title}</h1>
            <p className="text-lg text-primary/80 mb-2">{sermon.scripture}</p>
            <p className="text-muted-foreground">{sermon.excerpt}</p>
            <p className="text-sm text-muted-foreground mt-3 mb-4">
              Published{" "}
              {new Date(sermon.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              {" · "}By Bryant Clark
            </p>
            <SocialShareLinks title={sermon.title} url={`https://theislandofone.com/share/sermon/${id}`} />

            {isFullAccess && sermon.audio_url && (
              <div className="mt-6">
                <AudioPlayer audioUrl={sermon.audio_url} title={sermon.title} />
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
                <div key={i}>
                  {renderContent(p)}
                </div>
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
                      Buy for ${sermon.price?.toFixed(2)}
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                      <Link to="/membership">
                        <Crown className="h-4 w-4 mr-2" />
                        Subscribe & Get All
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
                  <div className="text-3xl font-bold text-primary">${sermon.price?.toFixed(2)}</div>
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

            {isFullAccess && !sermon.is_free && (
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
