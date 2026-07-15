import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useScenes, useCreateScene, useUpdateScene, useDeleteScene, useReorderScenes,
  type ExperienceScene,
} from "@/hooks/useExperienceScenes";

interface Props {
  experienceId: string;
  runtimeSeconds: number;
}

export default function TimelinePanel({ experienceId, runtimeSeconds }: Props) {
  const { data: scenes = [] } = useScenes(experienceId);
  const reorder = useReorderScenes();
  const create = useCreateScene();
  const del = useDeleteScene();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const ids = useMemo(() => scenes.map((s) => s.id), [scenes]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    const next = arrayMove(ids, oldIndex, newIndex);
    reorder.mutate({ experience_id: experienceId, order: next });
  };

  const addAt = (afterIndex: number) => {
    const prev = scenes[afterIndex];
    const next = scenes[afterIndex + 1];
    const start =
      prev?.end_ts != null ? prev.end_ts
      : prev?.start_ts != null ? prev.start_ts + 5
      : 0;
    const end =
      next?.start_ts != null ? next.start_ts
      : start + 10;
    create.mutate({
      experience_id: experienceId,
      order_index: afterIndex + 1,
      scene_type: "content",
      title: `Scene ${scenes.length + 1}`,
      start_ts: start,
      end_ts: end,
      enabled: true,
    }, {
      onSuccess: () => {
        // Re-apply order after insert to slot it in the right position
        const newOrder = [...ids.slice(0, afterIndex + 1), "__pending__", ...ids.slice(afterIndex + 1)];
        // Actual re-order happens on next fetch; nothing else needed
        void newOrder;
      },
    });
  };

  return (
    <div className="space-y-4">
      <RulerTimeline scenes={scenes} runtime={runtimeSeconds} experienceId={experienceId} />

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold">Scene Order</h3>
            <p className="text-xs text-muted-foreground">Drag rows to reorder. Edit timestamps inline.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => addAt(scenes.length - 1)} disabled={create.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Add at End
          </Button>
        </div>

        {scenes.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No scenes yet.</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {scenes.map((s, i) => (
                  <SortableRow
                    key={s.id}
                    scene={s}
                    index={i}
                    onDelete={() => del.mutate({ id: s.id, experience_id: experienceId })}
                    onInsertAfter={() => addAt(i)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </Card>
    </div>
  );
}

/* ---------- Sortable Row with inline timestamp editors ---------- */
function SortableRow({
  scene, index, onDelete, onInsertAfter,
}: {
  scene: ExperienceScene; index: number; onDelete: () => void; onInsertAfter: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id });
  const update = useUpdateScene();
  const [start, setStart] = useState<string>(scene.start_ts?.toString() ?? "");
  const [end, setEnd] = useState<string>(scene.end_ts?.toString() ?? "");
  const [title, setTitle] = useState<string>(scene.title ?? "");

  useEffect(() => {
    setStart(scene.start_ts?.toString() ?? "");
    setEnd(scene.end_ts?.toString() ?? "");
    setTitle(scene.title ?? "");
  }, [scene.id, scene.start_ts, scene.end_ts, scene.title]);

  const commit = (patch: Partial<ExperienceScene>) => {
    update.mutate({ id: scene.id, ...patch }, { onError: (e: any) => toast.error(e.message) });
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="rounded-md border bg-card p-2 flex flex-wrap items-center gap-2"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
        aria-label="Drag"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Badge variant="outline" className="text-xs">{index + 1}</Badge>
      <Input
        className="h-8 flex-1 min-w-[160px]"
        value={title}
        placeholder="Scene title"
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title !== (scene.title ?? "") && commit({ title })}
      />
      <div className="flex items-center gap-1 text-xs">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          className="h-8 w-20"
          type="number"
          step="0.1"
          placeholder="start"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          onBlur={() => {
            const v = start === "" ? null : Number(start);
            if (v !== scene.start_ts) commit({ start_ts: v });
          }}
        />
        <span className="text-muted-foreground">→</span>
        <Input
          className="h-8 w-20"
          type="number"
          step="0.1"
          placeholder="end"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          onBlur={() => {
            const v = end === "" ? null : Number(end);
            if (v !== scene.end_ts) commit({ end_ts: v });
          }}
        />
      </div>
      <Button size="sm" variant="ghost" onClick={onInsertAfter} title="Insert scene after this one">
        <Plus className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}

/* ---------- Horizontal ruler with draggable segment handles ---------- */
function RulerTimeline({
  scenes, runtime, experienceId,
}: {
  scenes: ExperienceScene[]; runtime: number; experienceId: string;
}) {
  const totalRaw = runtime || 0;
  const inferred = Math.max(totalRaw, ...scenes.map((s) => s.end_ts ?? 0), ...scenes.map((s) => s.start_ts ?? 0), 60);
  const total = inferred;
  const update = useUpdateScene();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; edge: "start" | "end" | "move"; startX: number; startTs: number; endTs: number } | null>(null);

  const pxPerSec = (width: number) => width / total;

  const onPointerDown = (e: React.PointerEvent, scene: ExperienceScene, edge: "start" | "end" | "move") => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      id: scene.id, edge, startX: e.clientX,
      startTs: scene.start_ts ?? 0, endTs: scene.end_ts ?? (scene.start_ts ?? 0) + 5,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const delta = (e.clientX - d.startX) / pxPerSec(w);
    const round = (n: number) => Math.max(0, Math.min(total, Math.round(n * 10) / 10));
    const el = containerRef.current.querySelector<HTMLElement>(`[data-scene-id="${d.id}"]`);
    if (!el) return;
    let s = d.startTs, en = d.endTs;
    if (d.edge === "start") s = Math.min(round(d.startTs + delta), en - 0.1);
    else if (d.edge === "end") en = Math.max(round(d.endTs + delta), s + 0.1);
    else { s = round(d.startTs + delta); en = round(d.endTs + delta); }
    el.style.left = `${(s / total) * 100}%`;
    el.style.width = `${((en - s) / total) * 100}%`;
    el.dataset.pendingStart = String(s);
    el.dataset.pendingEnd = String(en);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || !containerRef.current) return;
    const el = containerRef.current.querySelector<HTMLElement>(`[data-scene-id="${d.id}"]`);
    if (!el) return;
    const s = Number(el.dataset.pendingStart);
    const en = Number(el.dataset.pendingEnd);
    if (Number.isFinite(s) && Number.isFinite(en)) {
      update.mutate({ id: d.id, start_ts: s, end_ts: en });
    }
  };

  const marks = useMemo(() => {
    const step = total > 600 ? 60 : total > 120 ? 30 : total > 30 ? 10 : 5;
    const arr: number[] = [];
    for (let t = 0; t <= total; t += step) arr.push(t);
    return arr;
  }, [total]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const colorFor = (i: number) => {
    const hues = [200, 340, 45, 160, 280, 20, 120];
    return `hsl(${hues[i % hues.length]} 70% 45% / 0.85)`;
  };

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">Timeline</h3>
          <p className="text-xs text-muted-foreground">
            Drag segment edges to trim, or drag the middle to move. Total: {fmt(total)}
          </p>
        </div>
      </div>
      <div
        ref={containerRef}
        className="relative h-24 rounded-md border bg-muted/40 select-none"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Ruler ticks */}
        <div className="absolute inset-x-0 top-0 h-5 border-b border-border/60">
          {marks.map((t) => (
            <div key={t} className="absolute top-0 h-full border-l border-border/40 text-[10px] text-muted-foreground pl-1"
              style={{ left: `${(t / total) * 100}%` }}>
              {fmt(t)}
            </div>
          ))}
        </div>
        {/* Segments */}
        <div className="absolute inset-x-0 bottom-1 top-6">
          {scenes.map((s, i) => {
            const st = s.start_ts ?? 0;
            const en = s.end_ts ?? st + 5;
            const left = (st / total) * 100;
            const width = Math.max(0.5, ((en - st) / total) * 100);
            return (
              <div
                key={s.id}
                data-scene-id={s.id}
                className="absolute top-0 bottom-0 rounded-md shadow-sm text-white text-[11px] flex items-center overflow-hidden"
                style={{ left: `${left}%`, width: `${width}%`, background: colorFor(i) }}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-white/30 hover:bg-white/60"
                  onPointerDown={(e) => onPointerDown(e, s, "start")}
                />
                <div
                  className="flex-1 px-2 truncate cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => onPointerDown(e, s, "move")}
                  title={`${s.title ?? "Scene"} · ${fmt(st)} → ${fmt(en)}`}
                >
                  {i + 1}. {s.title || s.heading || "Scene"}
                </div>
                <div
                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-white/30 hover:bg-white/60"
                  onPointerDown={(e) => onPointerDown(e, s, "end")}
                />
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
