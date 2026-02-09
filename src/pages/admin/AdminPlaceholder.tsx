export default function AdminPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground">This module is coming in the next phase. Use the AI sidebar to start drafting content.</p>
      </div>
    </div>
  );
}
