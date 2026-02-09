import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { membershipPlans } from "@/data/content";
import { useSermons } from "@/hooks/useSermons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SocialShareLinks from "@/components/SocialShareLinks";
import AudioPlayer from "@/components/AudioPlayer";
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
} from "lucide-react";

export default function SermonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sermons } = useSermons();
  const sermon = sermons.find((s) => s.id === id);
  const [purchased, setPurchased] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

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
  const previewParagraphs = paragraphs.slice(0, sermon.previewCutoff + 1);
  const isFullAccess = sermon.isFree || purchased;

  const handleMockPurchase = () => {
    setPurchased(true);
    setShowCheckout(false);
  };

  const handleDownload = (format: string) => {
    // Mock download — in production this would generate the file
    const blob = new Blob([sermon.manuscript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sermon.title.replace(/\s+/g, "-").toLowerCase()}.${format === "Word" ? "docx" : format.toLowerCase()}`;
    a.click();
    URL.revokeObjectURL(url);
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
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {sermon.category}
              </span>
              {!sermon.isFree && !purchased && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Lock className="h-2.5 w-2.5" /> {sermon.accessLevel}
                </span>
              )}
              {sermon.isFree && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/5 text-primary/70 border border-primary/10">
                  Free
                </span>
              )}
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">
              {sermon.title}
            </h1>
            <p className="text-lg text-primary/80 mb-2">{sermon.scripture}</p>
            <p className="text-muted-foreground">{sermon.excerpt}</p>
            <p className="text-sm text-muted-foreground mt-3 mb-4">
              Published {new Date(sermon.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              {" · "}By Bryant Clark
            </p>
            <SocialShareLinks title={sermon.title} />

            {isFullAccess && sermon.audioUrl && (
              <div className="mt-6">
                <AudioPlayer audioUrl={sermon.audioUrl} title={sermon.title} />
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto grid lg:grid-cols-[1fr_300px] gap-8">
          {/* Manuscript */}
          <div>
            {/* Preview section */}
            <div className="mb-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <Eye className="h-3.5 w-3.5" />
                {isFullAccess ? "Full Manuscript" : "Preview"}
              </div>
            </div>

            <article className="prose prose-invert prose-lg max-w-none space-y-5">
              {(isFullAccess ? paragraphs : previewParagraphs).map((p, i) => (
                <p key={i} className="text-foreground/90 leading-relaxed">
                  {p}
                </p>
              ))}
            </article>

            {/* Paywall fade */}
            {!isFullAccess && (
              <div className="relative mt-0">
                <div className="absolute inset-x-0 -top-32 h-32 bg-gradient-to-b from-transparent to-background pointer-events-none" />
                <div className="pt-8 pb-4 text-center space-y-4">
                  <Lock className="h-8 w-8 text-primary mx-auto" />
                  <p className="font-display text-xl font-semibold">
                    Continue Reading
                  </p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Purchase this sermon to read the full manuscript and download in PDF, EPUB, or Word format.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button size="lg" onClick={() => setShowCheckout(true)}>
                      <ShoppingCart className="h-4 w-4 mr-2" />
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

            {/* Download section for purchased / free */}
            {isFullAccess && (
              <div className="mt-12 pt-8 border-t border-border">
                <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  Download This Sermon
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { format: "PDF", icon: FileText, desc: "Print-ready format" },
                    { format: "EPUB", icon: BookOpen, desc: "Kindle compatible" },
                    { format: "Word", icon: FileDown, desc: "Editable document" },
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
            {/* Purchase card (if not free and not purchased) */}
            {!isFullAccess && !showCheckout && (
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-lg">Get This Sermon</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold text-primary">
                    ${sermon.price?.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    One-time purchase. Download in PDF, EPUB, and Word.
                  </p>
                  <Button className="w-full" onClick={() => setShowCheckout(true)}>
                    <ShoppingCart className="h-4 w-4 mr-2" /> Purchase
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

            {/* Mock checkout card */}
            {showCheckout && !purchased && (
              <Card className="border-primary/30 shadow-gold">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-lg">Checkout</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-lg bg-secondary/50 space-y-1">
                    <p className="text-sm font-medium">{sermon.title}</p>
                    <p className="text-xs text-muted-foreground">{sermon.scripture}</p>
                    <p className="text-lg font-bold text-primary mt-2">
                      ${sermon.price?.toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>✓ Full manuscript access</p>
                    <p>✓ PDF, EPUB & Word download</p>
                    <p>✓ Lifetime access</p>
                  </div>
                  <Button className="w-full" size="lg" onClick={handleMockPurchase}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Complete Purchase (Demo)
                  </Button>
                  <button
                    onClick={() => setShowCheckout(false)}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    This is a demo checkout. Stripe integration coming soon.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Post-purchase confirmation */}
            {purchased && (
              <Card className="border-primary/30">
                <CardContent className="pt-6 text-center space-y-3">
                  <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
                  <p className="font-display text-lg font-semibold">Purchased!</p>
                  <p className="text-xs text-muted-foreground">
                    Full manuscript unlocked. Download below.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Subscribe CTA always visible */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Crown className="h-6 w-6 text-primary" />
                <p className="font-display text-sm font-semibold">
                  Unlock All Sermons
                </p>
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
      </div>
    </div>
  );
}
