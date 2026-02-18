import { useState, useCallback, useRef, useEffect } from "react";
import { ReaderChapterContent } from "./ReaderChapterContent";
import { ReaderNavigation } from "./ReaderNavigation";
import { ReaderTableOfContents } from "./ReaderTableOfContents";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { cn } from "@/lib/utils";
import { Lock, Mail } from "lucide-react";
import type { Book } from "@/hooks/useBooks";

interface InlineBookReaderProps {
  book: Book;
}

export const InlineBookReader = ({ book }: InlineBookReaderProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isFree = book.is_free;
  // Free books: all chapters. Paid books: only first chapter readable.
  const maxReadableIndex = isFree ? book.chapters.length - 1 : 0;
  const isCurrentLocked = currentIndex > maxReadableIndex;

  const goToNext = useCallback(() => {
    if (currentIndex < book.chapters.length - 1) {
      setSlideDirection("left");
      setCurrentIndex((p) => p + 1);
    }
  }, [currentIndex, book.chapters.length]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setSlideDirection("right");
      setCurrentIndex((p) => p - 1);
    }
  }, [currentIndex]);

  const goToChapter = useCallback(
    (index: number) => {
      setSlideDirection(index > currentIndex ? "left" : "right");
      setCurrentIndex(index);
    },
    [currentIndex]
  );

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    const timer = setTimeout(() => setSlideDirection(null), 300);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const swipeHandlers = useSwipeNavigation({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrevious,
  });

  const chapter = book.chapters[currentIndex];
  if (!chapter) return null;

  const isPreface = /preface|introduction|foreword|prologue/i.test(chapter.title);

  return (
    <div className="rounded-xl border border-border overflow-hidden book-reader-shell">
      <ReaderNavigation
        currentIndex={currentIndex}
        totalChapters={book.chapters.length}
        chapterTitle={chapter.title}
        onPrevious={goToPrevious}
        onNext={goToNext}
        onOpenToc={() => setIsTocOpen(true)}
      />

      <div
        ref={contentRef}
        className={cn(
          "max-h-[70vh] overflow-auto py-8",
          slideDirection === "left" && "animate-fade-up",
          slideDirection === "right" && "animate-fade-up"
        )}
        {...swipeHandlers}
      >
        {isCurrentLocked ? (
          <div className="text-center py-16 px-6">
            <Lock className="h-10 w-10 mx-auto mb-4" style={{ color: "hsl(0 45% 35%)" }} />
            <h3 className="font-display text-xl font-bold mb-2" style={{ color: "#1a1a1a" }}>
              Chapter Locked
            </h3>
            <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "#666" }}>
              Purchase this book or subscribe to unlock all {book.chapters.length} chapters of "{book.title}".
            </p>
            <a
              href="/speaking"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-gold"
            >
              <Mail className="h-4 w-4" /> Contact to Purchase — ${book.price}
            </a>
          </div>
        ) : (
          <ReaderChapterContent
            title={chapter.title}
            content={chapter.content}
            chapterNumber={isPreface ? undefined : currentIndex + 1}
            isPreface={isPreface}
          />
        )}
      </div>

      <ReaderTableOfContents
        title={book.title}
        author={book.author}
        chapters={book.chapters}
        currentIndex={currentIndex}
        isOpen={isTocOpen}
        onClose={() => setIsTocOpen(false)}
        onSelectChapter={goToChapter}
        lockedAfterIndex={isFree ? undefined : maxReadableIndex}
      />
    </div>
  );
};
