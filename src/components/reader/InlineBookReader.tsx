import { useState, useCallback, useRef, useEffect } from "react";
import { ReaderChapterContent } from "./ReaderChapterContent";
import { ReaderNavigation } from "./ReaderNavigation";
import { ReaderTableOfContents } from "./ReaderTableOfContents";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { cn } from "@/lib/utils";
import type { Book } from "@/hooks/useBooks";

interface InlineBookReaderProps {
  book: Book;
}

export const InlineBookReader = ({ book }: InlineBookReaderProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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
    <div className="rounded-xl border border-border bg-card overflow-hidden">
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
        <ReaderChapterContent
          title={chapter.title}
          content={chapter.content}
          chapterNumber={isPreface ? undefined : currentIndex + 1}
          isPreface={isPreface}
        />
      </div>

      <ReaderTableOfContents
        title={book.title}
        author={book.author}
        chapters={book.chapters}
        currentIndex={currentIndex}
        isOpen={isTocOpen}
        onClose={() => setIsTocOpen(false)}
        onSelectChapter={goToChapter}
      />
    </div>
  );
};
