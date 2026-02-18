import { X, BookOpen, Lock } from "lucide-react";
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
  lockedAfterIndex?: number;
}

export const ReaderTableOfContents = ({
  title,
  author,
  chapters,
  currentIndex,
  isOpen,
  onClose,
  onSelectChapter,
  lockedAfterIndex,
}: ReaderTableOfContentsProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 animate-fade-in" style={{ background: "#faf8f5" }}>
      <div className="h-full overflow-auto">
        <header className="sticky top-0 backdrop-blur-sm border-b px-4 py-4" style={{ background: "rgba(250,248,245,0.95)", borderColor: "#e0dcd5" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2" style={{ color: "hsl(0 45% 35%)" }}>
              <BookOpen className="w-5 h-5" />
              <span className="font-display text-lg">Contents</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 transition-colors"
              style={{ color: "#888" }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="px-6 py-8 text-center border-b" style={{ borderColor: "#e0dcd5" }}>
          <h1 className="font-display text-2xl md:text-3xl mb-2" style={{ color: "#1a1a1a" }}>{title}</h1>
          <p className="text-sm italic" style={{ color: "#888" }}>by {author}</p>
        </div>

        <nav className="px-4 py-6">
          <ul className="space-y-1">
            {chapters.map((chapter, index) => {
              const isLocked = lockedAfterIndex !== undefined && index > lockedAfterIndex;
              const isPreface = /preface|introduction|foreword|prologue/i.test(chapter.title);

              return (
                <li key={chapter.id}>
                  <button
                    onClick={() => {
                      onSelectChapter(index);
                      onClose();
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded transition-colors",
                      index === currentIndex ? "font-semibold" : ""
                    )}
                    style={{
                      background: index === currentIndex ? "hsl(0 45% 35% / 0.08)" : isPreface ? "hsl(0 45% 35% / 0.04)" : "transparent",
                      color: index === currentIndex ? "hsl(0 45% 35%)" : isLocked ? "#aaa" : "#1a1a1a",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs w-4" style={{ color: "#aaa" }}>
                        {isPreface ? "" : String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="font-display flex-1">
                        {isPreface ? chapter.title.toUpperCase() : chapter.title}
                      </span>
                      {isLocked && <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: "#ccc" }} />}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
};
