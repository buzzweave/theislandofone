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
      <nav className="sticky top-0 z-40 border-b" style={{ background: "#f5f2ed", borderColor: "#e0dcd5" }}>
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onOpenToc}
            className="reader-nav-btn transition-colors text-sm font-display"
            style={{ color: "#666" }}
          >
            Contents
          </button>
          <span className="text-sm truncate max-w-[50%]" style={{ color: "#888" }}>{chapterTitle}</span>
          <span className="text-sm" style={{ color: "#888" }}>
            {currentIndex + 1}/{totalChapters}
          </span>
        </div>
      </nav>

      {/* Bottom navigation */}
      <nav className="sticky bottom-0 z-40 border-t" style={{ background: "#f5f2ed", borderColor: "#e0dcd5" }}>
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={onPrevious}
            disabled={!hasPrevious}
            className={cn(
              "flex items-center gap-1 text-sm transition-colors",
              hasPrevious ? "hover:opacity-70" : "cursor-not-allowed"
            )}
            style={{ color: hasPrevious ? "hsl(0 45% 35%)" : "#ccc" }}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="flex gap-1">
            {Array.from({ length: totalChapters }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{ background: i === currentIndex ? "hsl(0 45% 35%)" : "#d0ccc5" }}
              />
            ))}
          </div>

          <button
            onClick={onNext}
            disabled={!hasNext}
            className={cn(
              "flex items-center gap-1 text-sm transition-colors",
              hasNext ? "hover:opacity-70" : "cursor-not-allowed"
            )}
            style={{ color: hasNext ? "hsl(0 45% 35%)" : "#ccc" }}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </nav>
    </>
  );
};
