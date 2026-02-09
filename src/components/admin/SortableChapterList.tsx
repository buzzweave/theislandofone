import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { type BookChapter } from "@/data/content";

interface SortableChapterProps {
  chapter: BookChapter;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (fields: Partial<BookChapter>) => void;
  onDelete: () => void;
}

function SortableChapter({
  chapter,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
}: SortableChapterProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-border rounded-lg overflow-hidden bg-card"
    >
      <div className="flex items-center gap-2 px-3 py-2.5 text-sm">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-0.5 -ml-1"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 text-left hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="text-muted-foreground text-xs w-6">{index + 1}.</span>
          <span className="font-medium truncate">{chapter.title}</span>
        </button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 shrink-0"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border pt-3">
          <div>
            <Label className="text-xs">Chapter Title</Label>
            <Input
              value={chapter.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Content</Label>
            <Textarea
              value={chapter.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              rows={8}
              className="font-body text-sm leading-relaxed"
              placeholder="Write chapter content here..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface SortableChapterListProps {
  chapters: BookChapter[];
  onReorder: (chapters: BookChapter[]) => void;
  onUpdateChapter: (id: string, fields: Partial<BookChapter>) => void;
  onDeleteChapter: (id: string) => void;
}

export default function SortableChapterList({
  chapters,
  onReorder,
  onUpdateChapter,
  onDeleteChapter,
}: SortableChapterListProps) {
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = chapters.findIndex((ch) => ch.id === active.id);
    const newIndex = chapters.findIndex((ch) => ch.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...chapters];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    onReorder(reordered);
  };

  if (chapters.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No chapters yet. Click "Add Chapter" to begin.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={chapters.map((ch) => ch.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {chapters.map((ch, idx) => (
            <SortableChapter
              key={ch.id}
              chapter={ch}
              index={idx}
              isExpanded={expandedChapter === ch.id}
              onToggle={() =>
                setExpandedChapter(expandedChapter === ch.id ? null : ch.id)
              }
              onUpdate={(fields) => onUpdateChapter(ch.id, fields)}
              onDelete={() => onDeleteChapter(ch.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
