import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReaderNavigationProps {
  currentIndex: number;
  totalChapters: number;
  chapterTitle: string;
  onPrevious: () => void;
  onNext: () => void;
  onOpenToc: () => void;
}

export const ReaderNavigation = ({
  currentIndex,
  totalChapters,
  chapterTitle,
  onPrevious,
  onNext,
  onOpenToc,
}: ReaderNavigationProps) => {
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < totalChapters - 1;

  return (
    <>
      {/* Top bar */}
      <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onOpenToc}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-display"
          >
            Contents
          </button>
          <span className="text-sm text-muted-foreground truncate max-w-[50%]">{chapterTitle}</span>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1}/{totalChapters}
          </span>
        </div>
      </nav>

      {/* Bottom navigation */}
      <nav className="sticky bottom-0 z-40 bg-background/80 backdrop-blur-sm border-t border-border/50">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={onPrevious}
            disabled={!hasPrevious}
            className={cn(
              "flex items-center gap-1 text-sm transition-colors",
              hasPrevious ? "text-primary hover:text-primary/80" : "text-muted-foreground/30 cursor-not-allowed"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="flex gap-1">
            {Array.from({ length: totalChapters }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  i === currentIndex ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>

          <button
            onClick={onNext}
            disabled={!hasNext}
            className={cn(
              "flex items-center gap-1 text-sm transition-colors",
              hasNext ? "text-primary hover:text-primary/80" : "text-muted-foreground/30 cursor-not-allowed"
            )}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </nav>
    </>
  );
};
