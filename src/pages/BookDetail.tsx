import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, Download, FileText, Lock, Mail } from "lucide-react";
import { exportBookToPdf, exportBookToEpub } from "@/lib/bookExport";
import { useBook } from "@/hooks/useBooks";
import SocialShareLinks from "@/components/SocialShareLinks";
import AudioPlayer from "@/components/AudioPlayer";
import DOMPurify from "dompurify";

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: book, isLoading } = useBook(id);
  const [openChapter, setOpenChapter] = useState<string | null>(null);

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

  const canRead = book.is_free;
  const previewChapterCount = book.is_free ? book.chapters.length : 1;

  const toggleChapter = (chapterId: string) => {
    setOpenChapter(openChapter === chapterId ? null : chapterId);
  };

  const renderContent = (content: string) => {
    const isHtml = content?.includes("<") && content?.includes(">");
    if (isHtml) {
      return (
        <div
          className="prose prose-invert prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      );
    }
    return (
      <p className="text-secondary-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
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
              <span className="text-xs text-primary uppercase tracking-[0.2em] mb-2 block">
                {book.category}
              </span>
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">{book.title}</h1>
              {book.subtitle && (
                <p className="text-muted-foreground text-lg mb-1">{book.subtitle}</p>
              )}
              <p className="text-muted-foreground text-sm mb-6">by {book.author}</p>
              <div className="text-secondary-foreground leading-relaxed text-base mb-8 max-w-xl">
                {renderContent(book.description)}
              </div>

              <div className="flex flex-wrap items-center gap-3 mb-4">
                {book.is_free ? (
                  <>
                    <button
                      onClick={() => exportBookToPdf(book)}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-gold"
                    >
                      <Download className="h-4 w-4" /> Download PDF
                    </button>
                    <button
                      onClick={() => exportBookToEpub(book)}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
                    >
                      <FileText className="h-4 w-4" /> Download EPUB
                    </button>
                  </>
                ) : (
                  <a
                    href="/speaking"
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-gold"
                  >
                    <Mail className="h-4 w-4" /> Contact to Purchase — ${book.price}
                  </a>
                )}
              </div>

              <p className="text-xs text-muted-foreground mb-4">
                {book.chapters.length} chapter{book.chapters.length !== 1 ? "s" : ""}
                {!book.is_free && ` · Preview first chapter free`}
              </p>

              <SocialShareLinks title={book.title} />

              {canRead && book.audio_url && (
                <div className="mt-6">
                  <AudioPlayer audioUrl={book.audio_url} title={book.title} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Chapters */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="font-display text-2xl font-bold mb-8 flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary" /> Chapters
          </h2>

          <div className="space-y-3">
            {book.chapters.map((chapter, index) => {
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
                        <div className="prose prose-invert prose-sm max-w-none">
                          {renderContent(chapter.content)}
                        </div>

                        {!canRead && isPreview && (
                          <div className="mt-6 p-5 rounded-lg border border-primary/20 bg-primary/5 text-center">
                            <Lock className="h-5 w-5 text-primary mx-auto mb-2" />
                            <p className="font-display font-semibold text-sm mb-1">
                              Enjoying the preview?
                            </p>
                            <p className="text-xs text-muted-foreground mb-3">
                              Contact us to purchase this book and unlock all {book.chapters.length} chapters.
                            </p>
                            <a
                              href="/speaking"
                              className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-gold"
                            >
                              <Mail className="h-3.5 w-3.5" /> Contact to Purchase
                            </a>
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
                Get access to all {book.chapters.length} chapters of "{book.title}" by {book.author}. Contact us to purchase.
              </p>
              <a
                href="/speaking"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-gold"
              >
                <Mail className="h-4 w-4" /> Contact to Purchase
              </a>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
