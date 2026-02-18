interface ChapterHeaderProps {
  number?: number;
  title: string;
  isPreface?: boolean;
}

export const ChapterHeader = ({ number, title, isPreface = false }: ChapterHeaderProps) => (
  <header className="text-center mb-8 pt-4">
    {!isPreface && number !== undefined && (
      <span className="block mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground font-display">
        Chapter {number}
      </span>
    )}
    <h1 className="font-display text-2xl md:text-3xl text-foreground font-bold">
      {title}
    </h1>
    <div className="mt-4 flex justify-center">
      <div className="w-12 h-px bg-primary/40" />
    </div>
  </header>
);
