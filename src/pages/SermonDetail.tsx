import { useState, useEffect } from "react";
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
import FacebookComments from "@/components/FacebookComments";
import DOMPurify from "dompurify";
import { exportSermonToPdf, exportSermonToEpub, exportSermonToWord, exportSermonToGoodNotesPdf } from "@/lib/sermonExport";
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
          className="sermon-content [&_*]:!text-white"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      );
    }
    return <p className="text-white leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '20px', lineHeight: 1.7 }}>{content}</p>;
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

            <article className="sermon-content max-w-none">
              {(isFullAccess ? paragraphs : previewParagraphs).map((p, i) => (
                <div key={i} className="text-white leading-relaxed">
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
          <FacebookComments slug={`sermons/${id}`} />
        </div>
      </div>
    </div>
  );
}
