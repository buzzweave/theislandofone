import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, Crown, Download, FileText, Lock, Mail, ShoppingCart, CheckCircle2, Loader2, Headphones } from "lucide-react";
import { exportBookToPdf, exportBookToEpub, exportBookToWord } from "@/lib/bookExport";
import { useBook } from "@/hooks/useBooks";
import { useAuth } from "@/contexts/AuthContext";
import { getTierByProductId, tierHasAccess } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import SocialShareLinks from "@/components/SocialShareLinks";
import CommentsWithRating from "@/components/CommentsWithRating";
import AudioPlayer from "@/components/AudioPlayer";
import DOMPurify from "dompurify";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InlineBookReader } from "@/components/reader/InlineBookReader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { membershipPlans } from "@/data/content";
import { toast } from "sonner";
import { supabaseImageUrl, supabaseImageSrcSet } from "@/lib/supabaseImage";

/** AudioPlayer with cover from audiobooks table */
function AudioPlayerWithCover({ audioUrl, title, bookId, fallbackCover }: { audioUrl: string; title: string; bookId: string; fallbackCover?: string }) {
  const [cover, setCover] = useState(fallbackCover || "");
  useEffect(() => {
    if (!bookId) return;
    supabase
      .from("audiobooks")
      .select("cover_image")
      .eq("content_type", "book")
      .eq("content_id", bookId)
      .eq("is_visible", true)
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]?.cover_image) setCover(data[0].cover_image);
      });
  }, [bookId]);

  const handleDownloadCover = async () => {
    if (!cover) return;
    try {
      const resp = await fetch(cover);
      const blob = await resp.blob();
      const ext = blob.type.includes("png") ? "png" : "jpg";
      const { triggerDownload } = await import("@/lib/downloadHelper");
      await triggerDownload(blob, `${title.replace(/\s+/g, "-").toLowerCase()}-cover.${ext}`);
    } catch { window.open(cover, "_blank"); }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {cover && (
        <div className="flex items-center gap-3 mb-2">
          <img src={cover} alt="Audio cover" className="w-16 h-22 object-cover rounded-lg border border-border shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-primary" />
              <span className="font-display text-sm font-semibold">Audio Version</span>
            </div>
            <button onClick={handleDownloadCover} className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors">
              <Download className="h-3 w-3" /> Download Cover
            </button>
          </div>
        </div>
      )}
      {!cover && (
        <div className="flex items-center gap-2">
          <Headphones className="h-5 w-5 text-primary" />
          <span className="font-display text-sm font-semibold">Audio Version</span>
        </div>
      )}
      <audio controls className="w-full h-10" src={audioUrl}>
        Your browser does not support the audio element.
      </audio>
      <a
        href={audioUrl}
        download={`${title.replace(/\s+/g, "-").toLowerCase()}.mp3`}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors"
      >
        <Download className="h-3.5 w-3.5" /> Download Audiobook
      </a>
    </div>
  );
}

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: book, isLoading } = useBook(id);
  const { user, isSubscribed, subscription, checkPurchase } = useAuth();
  const [openChapter, setOpenChapter] = useState<string | null>(null);
  const [purchased, setPurchased] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Check purchase status
  useEffect(() => {
    if (!user || !id || !book || book.is_free) return;
    checkPurchase("book", id).then((result) => setPurchased(result));
  }, [user, id, book, checkPurchase]);

  useEffect(() => {
    if (book?.chapters[0]?.id && !openChapter) {
      setOpenChapter(book.chapters[0].id);
    }
  }, [book]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold mb-4">Book Not Found</h1>
          <Link to="/books" className="text-primary hover:underline">← Back to Books</Link>
        </div>
      </div>
    );
  }

  const userTier = getTierByProductId(subscription.product_id);
  const tierAccess = tierHasAccess(userTier, (book as any).access_tiers || []);
  const canRead = book.is_free || purchased || isSubscribed || tierAccess;

  const toggleChapter = (chapterId: string) => {
    setOpenChapter(openChapter === chapterId ? null : chapterId);
  };

  const handlePurchase = async () => {
    if (!user) {
      navigate("/auth", { state: { from: `/books/${id}` } });
      return;
    }
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          type: "book",
          itemId: id,
          priceAmount: book.price,
          itemTitle: book.title,
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

  const renderContent = (content: string) => {
    const isHtml = content?.includes("<") && content?.includes(">");
    if (isHtml) {
      return (
        <div
          className="prose prose-invert prose-sm max-w-none [&_*]:!text-white"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      );
    }
    return (
      <p className="text-white leading-relaxed whitespace-pre-wrap">{content}</p>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-16 bg-gradient-section">
        <div className="container mx-auto px-4">
          <Link
            to="/books"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Books
          </Link>

          <div className="max-w-5xl mx-auto md:flex gap-10 items-start">
            {/* Cover */}
            <div className="md:w-1/3 mb-8 md:mb-0">
              <div className="aspect-[2/3] rounded-xl overflow-hidden border border-border shadow-gold">
                {book.cover_image ? (
                  <img
                    src={book.cover_image}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-card flex items-center justify-center">
                    <BookOpen className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="md:w-2/3">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs text-primary uppercase tracking-[0.2em]">
                  {book.category}
                </span>
                {!book.is_free && !purchased && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    <Lock className="h-2.5 w-2.5" /> Premium
                  </span>
                )}
                {book.is_free && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/5 text-primary/70 border border-primary/10">
                    Free
                  </span>
                )}
                {book.audio_url && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    <Headphones className="h-2.5 w-2.5" /> Audio Version
                  </span>
                )}
              </div>
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">{book.title}</h1>
              {book.subtitle && (
                <p className="text-muted-foreground text-lg mb-1">{book.subtitle}</p>
              )}
              <p className="text-muted-foreground text-sm mb-6">by {book.author}</p>
              <div className="text-white leading-relaxed text-base mb-8 max-w-xl">
                {renderContent(book.description)}
              </div>

              <Tabs defaultValue="read" className="w-full mb-4">
                <TabsList className="mb-4">
                  {canRead && (
                    <TabsTrigger value="download" className="gap-2">
                      <Download className="h-4 w-4" /> Download
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="read" className="gap-2">
                    <BookOpen className="h-4 w-4" /> Read Online
                  </TabsTrigger>
                </TabsList>

                {canRead && (
                  <TabsContent value="download">
                    <div className="flex flex-wrap items-center gap-3">
                      {(book as any).pdf_url ? (
                        <a
                          href={(book as any).pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-gold"
                        >
                          <Download className="h-4 w-4" /> Download PDF
                        </a>
                      ) : (
                        <button
                          onClick={() => exportBookToPdf(book)}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-gold"
                        >
                          <Download className="h-4 w-4" /> Download PDF
                        </button>
                      )}
                      <button
                        onClick={() => exportBookToEpub(book)}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
                      >
                        <FileText className="h-4 w-4" /> Download EPUB
                      </button>
                      <button
                        onClick={() => exportBookToWord(book)}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
                      >
                        <FileText className="h-4 w-4" /> Download Word
                      </button>
                    </div>
                  </TabsContent>
                )}

                <TabsContent value="read">
                  <InlineBookReader book={book} />
                </TabsContent>
              </Tabs>

              <p className="text-xs text-muted-foreground mb-4">
                {book.chapters.length} chapter{book.chapters.length !== 1 ? "s" : ""}
                {!book.is_free && !purchased && ` · Preview first chapter free`}
              </p>

              <SocialShareLinks title={book.title} url={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-book?id=${encodeURIComponent(id || '')}`} pageUrl={`https://theislandofone.com/books/${id}`} description={book.subtitle || book.description || ""} />

              {canRead && book.audio_url && (
                <div className="mt-6">
                  <AudioPlayerWithCover audioUrl={book.audio_url} title={book.title} bookId={id || ""} fallbackCover={book.cover_image} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Chapters + Sidebar */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-[1fr_300px] gap-8">
            {/* Chapters */}
            <div>
              <h2 className="font-display text-2xl font-bold mb-8 flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" /> Chapters
              </h2>

              <div className="space-y-3">
                {book.chapters.map((chapter, index) => {
                  const previewChapterCount = book.is_free ? book.chapters.length : 1;
                  const isPreview = index < previewChapterCount;
                  const isLocked = !canRead && !isPreview;
                  const isOpen = openChapter === chapter.id;

                  return (
                    <div
                      key={chapter.id}
                      className={`rounded-xl border transition-all ${
                        isOpen
                          ? "border-primary/30 bg-card shadow-gold"
                          : "border-border bg-card hover:border-primary/20"
                      }`}
                    >
                      <button
                        onClick={() => !isLocked && toggleChapter(chapter.id)}
                        className={`w-full text-left px-5 py-4 flex items-center gap-4 ${
                          isLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                        }`}
                      >
                        <span className="text-primary font-display font-bold text-lg w-8 shrink-0">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1 font-medium text-foreground">
                          {chapter.title}
                        </span>
                        {isLocked ? (
                          <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : isOpen ? (
                          <ChevronDown className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>

                      {isOpen && !isLocked && (
                        <div className="px-5 pb-5 animate-fade-up">
                          <div className="border-t border-border pt-4 ml-12">
                            <div className="book-chapter-content prose prose-invert prose-sm max-w-none [&_*]:!text-white">
                              {renderContent(chapter.content)}
                            </div>

                            <p className="mt-6 text-xs text-muted-foreground text-center">
                              © {new Date().getFullYear()} The Island of One Ministries. All rights reserved. For personal use only.
                            </p>

                            {!canRead && isPreview && (
                              <div className="mt-6 p-5 rounded-lg border border-primary/20 bg-primary/5 text-center">
                                <Lock className="h-5 w-5 text-primary mx-auto mb-2" />
                                <p className="font-display font-semibold text-sm mb-1">
                                  Enjoying the preview?
                                </p>
                                <p className="text-xs text-muted-foreground mb-3">
                                  Purchase this book to unlock all {book.chapters.length} chapters.
                                </p>
                                <Button size="sm" onClick={handlePurchase} disabled={checkoutLoading}>
                                   {checkoutLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5 mr-1" />} Buy for ${Number(book.price || 0).toFixed(2)}
                                 </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!canRead && (
                <div className="mt-12 p-8 rounded-2xl border border-primary/20 bg-card text-center">
                  <Lock className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-display text-xl font-bold mb-2">
                    Unlock the Full Book
                  </h3>
                  <p className="text-muted-foreground text-sm mb-5 max-w-md mx-auto">
                    Get access to all {book.chapters.length} chapters of "{book.title}" by {book.author}.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button size="lg" onClick={handlePurchase} disabled={checkoutLoading}>
                      {checkoutLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
Buy for ${Number(book.price || 0).toFixed(2)}
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                      <Link to="/membership">
                        <Crown className="h-4 w-4 mr-2" />
                        Subscribe & Get All
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {!canRead && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-display text-lg">Get This Book</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-3xl font-bold text-primary">${Number(book.price || 0).toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">One-time purchase. Download in PDF, EPUB, and Word.</p>
                    <Button className="w-full" onClick={handlePurchase} disabled={checkoutLoading}>
                      {checkoutLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShoppingCart className="h-4 w-4 mr-2" />} Purchase
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

              {canRead && !book.is_free && (
                <Card className="border-primary/30">
                  <CardContent className="pt-6 text-center space-y-3">
                    <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
                    <p className="font-display text-lg font-semibold">
                      {isSubscribed ? "Subscriber Access" : "Purchased!"}
                    </p>
                    <p className="text-xs text-muted-foreground">Full book unlocked. Download above.</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="pt-6 space-y-3">
                  <Crown className="h-6 w-6 text-primary" />
                  <p className="font-display text-sm font-semibold">Unlock All Books</p>
                  <p className="text-xs text-muted-foreground">
                    Subscribe to get unlimited access to our entire book library plus exclusive resources.
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
            <CommentsWithRating contentType="book" contentId={id!} />
          </div>
        </div>
      </section>
    </div>
  );
}
