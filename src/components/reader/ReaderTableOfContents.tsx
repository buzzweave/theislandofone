import { X, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Chapter {
  id: string;
  title: string;
}

interface ReaderTableOfContentsProps {
  title: string;
  author: string;
  chapters: Chapter[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSelectChapter: (index: number) => void;
}

export const ReaderTableOfContents = ({
  title,
  author,
  chapters,
  currentIndex,
  isOpen,
  onClose,
  onSelectChapter,
}: ReaderTableOfContentsProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background animate-fade-in">
      <div className="h-full overflow-auto">
        <header className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="w-5 h-5" />
              <span className="font-display text-lg">Contents</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="px-6 py-8 text-center border-b border-border/50">
          <h1 className="font-display text-2xl md:text-3xl text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground text-sm italic">by {author}</p>
        </div>

        <nav className="px-4 py-6">
          <ul className="space-y-1">
            {chapters.map((chapter, index) => (
              <li key={chapter.id}>
                <button
                  onClick={() => {
                    onSelectChapter(index);
                    onClose();
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded transition-colors",
                    index === currentIndex
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="text-xs text-muted-foreground w-4">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display">{chapter.title}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
};
