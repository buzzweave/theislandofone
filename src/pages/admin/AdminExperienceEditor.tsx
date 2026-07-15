import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Loader2, Save, Upload, Trash2, Plus, ChevronUp, ChevronDown,
  Film, Layers, Sparkles, Eye, MousePointerClick, Image as ImageIcon, Clock, BarChart3, ExternalLink,
  HeartHandshake, MessageCircle,
} from "lucide-react";
import TimelinePanel from "./experience/TimelinePanel";
import AnalyticsPanel from "./experience/AnalyticsPanel";
import PrayerWallPanel from "./experience/PrayerWallPanel";
import ResponsesPanel from "./experience/ResponsesPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useExperience, useUpdateExperience, type ImmersiveExperience } from "@/hooks/useExperiences";
import { useExperienceSeriesList } from "@/hooks/useExperienceSeries";
import {
  useScenes, useCreateScene, useUpdateScene, useDeleteScene, type ExperienceScene,
} from "@/hooks/useExperienceScenes";
import {
  useExperienceMedia, useAddMedia, useDeleteMedia, uploadExperienceFile,
} from "@/hooks/useExperienceMedia";
import {
  useInteractions, useCreateInteraction, useUpdateInteraction, useDeleteInteraction,
  type ExperienceInteraction,
} from "@/hooks/useExperienceInteractions";

export default function AdminExperienceEditor() {
  const { id } = useParams<{ id: string }>();
  const { data: experience, isLoading } = useExperience(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!experience) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/experiences"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
        <Card className="p-10 text-center">Experience not found.</Card>
      </div>
    );
  }
  return <EditorInner experience={experience} />;
}

function EditorInner({ experience }: { experience: ImmersiveExperience }) {
  const [tab, setTab] = useState("details");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/experiences"><ArrowLeft className="h-4 w-4 mr-1" /> All Experiences</Link>
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant={experience.status === "published" ? "default" : "secondary"}>
            {experience.status}
          </Badge>
          {experience.members_only && <Badge variant="outline">Members Only</Badge>}
          <Button size="sm" variant="outline" asChild>
            <a href={`/experiences/${experience.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" /> Open Player
            </a>
          </Button>
        </div>
      </div>
      <div>
        <h2 className="font-display text-2xl font-semibold">{experience.title}</h2>
        <p className="text-sm text-muted-foreground">/{experience.slug}</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="details"><Sparkles className="h-4 w-4 mr-1" />Details</TabsTrigger>
          <TabsTrigger value="video"><Film className="h-4 w-4 mr-1" />Video</TabsTrigger>
          <TabsTrigger value="media"><ImageIcon className="h-4 w-4 mr-1" />Media</TabsTrigger>
          <TabsTrigger value="scenes"><Layers className="h-4 w-4 mr-1" />Scenes</TabsTrigger>
          <TabsTrigger value="timeline"><Clock className="h-4 w-4 mr-1" />Timeline</TabsTrigger>
          <TabsTrigger value="interactions"><MousePointerClick className="h-4 w-4 mr-1" />Interactions</TabsTrigger>
          <TabsTrigger value="preview"><Eye className="h-4 w-4 mr-1" />Preview</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" />Analytics</TabsTrigger>
        </TabsList>
          <TabsTrigger value="responses"><MessageCircle className="h-4 w-4 mr-1" />Responses</TabsTrigger>
          <TabsTrigger value="prayer"><HeartHandshake className="h-4 w-4 mr-1" />Prayer Wall</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" />Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-4"><DetailsPanel experience={experience} /></TabsContent>
        <TabsContent value="video" className="mt-4"><VideoPanel experience={experience} /></TabsContent>
        <TabsContent value="media" className="mt-4"><MediaPanel experienceId={experience.id} /></TabsContent>
        <TabsContent value="scenes" className="mt-4"><ScenesPanel experienceId={experience.id} /></TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <TimelinePanel experienceId={experience.id} runtimeSeconds={experience.runtime_seconds ?? 0} />
        </TabsContent>
        <TabsContent value="interactions" className="mt-4"><InteractionsPanel experienceId={experience.id} /></TabsContent>
        <TabsContent value="preview" className="mt-4"><PreviewPanel experience={experience} /></TabsContent>
        <TabsContent value="responses" className="mt-4"><ResponsesPanel experienceId={experience.id} /></TabsContent>
        <TabsContent value="prayer" className="mt-4"><PrayerWallPanel experienceId={experience.id} /></TabsContent>
        <TabsContent value="analytics" className="mt-4"><AnalyticsPanel experienceId={experience.id} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* -------------------- Details -------------------- */
function DetailsPanel({ experience }: { experience: ImmersiveExperience }) {
  const [form, setForm] = useState({ ...experience });
  const update = useUpdateExperience();
  const { data: seriesList = [] } = useExperienceSeriesList();
  useEffect(() => setForm({ ...experience }), [experience.id]);
  const set = <K extends keyof ImmersiveExperience>(k: K, v: ImmersiveExperience[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    try {
      await update.mutateAsync({
        id: experience.id,
        title: form.title,
        slug: form.slug,
        series_id: form.series_id,
        short_description: form.short_description,
        long_description: form.long_description,
        primary_scripture: form.primary_scripture,
        speaker: form.speaker,
        category: form.category,
        audience: form.audience,
        release_date: form.release_date,
        premiere_at: form.premiere_at,
        status: form.status,
        visibility: form.visibility,
        members_only: form.members_only,
        allow_download: form.allow_download,
      });
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title"><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Slug"><Input value={form.slug} onChange={(e) => set("slug", e.target.value)} /></Field>
        <Field label="Series">
          <Select
            value={form.series_id ?? "__none__"}
            onValueChange={(v) => set("series_id", v === "__none__" ? null : (v as any))}
          >
            <SelectTrigger><SelectValue placeholder="No series" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— No series —</SelectItem>
              {seriesList.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Speaker"><Input value={form.speaker ?? ""} onChange={(e) => set("speaker", e.target.value)} /></Field>
        <Field label="Category"><Input value={form.category ?? ""} onChange={(e) => set("category", e.target.value)} /></Field>
        <Field label="Audience"><Input value={form.audience ?? ""} onChange={(e) => set("audience", e.target.value)} /></Field>
        <Field label="Primary Scripture"><Input value={form.primary_scripture ?? ""} onChange={(e) => set("primary_scripture", e.target.value)} /></Field>
        <Field label="Release Date"><Input type="date" value={form.release_date?.slice(0, 10) ?? ""} onChange={(e) => set("release_date", e.target.value as any)} /></Field>
        <Field label="Premiere At"><Input type="datetime-local" value={form.premiere_at?.slice(0, 16) ?? ""} onChange={(e) => set("premiere_at", e.target.value as any)} /></Field>
      </div>
      <Field label="Short Description">
        <Textarea rows={2} value={form.short_description ?? ""} onChange={(e) => set("short_description", e.target.value)} />
      </Field>
      <Field label="Long Description">
        <Textarea rows={5} value={form.long_description ?? ""} onChange={(e) => set("long_description", e.target.value)} />
      </Field>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Visibility">
          <Select value={form.visibility} onValueChange={(v) => set("visibility", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="space-y-3 pt-6">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.members_only} onCheckedChange={(v) => set("members_only", v)} /> Members only
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.allow_download} onCheckedChange={(v) => set("allow_download", v)} /> Allow download
          </label>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={update.isPending}>
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save Details
        </Button>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/* -------------------- Video -------------------- */
function VideoPanel({ experience }: { experience: ImmersiveExperience }) {
  const [form, setForm] = useState({
    video_url: experience.video_url ?? "",
    video_provider: experience.video_provider ?? "url",
    video_playback_id: experience.video_playback_id ?? "",
    trailer_url: experience.trailer_url ?? "",
    poster_url: experience.poster_url ?? "",
    captions_url: experience.captions_url ?? "",
    ambient_audio_url: experience.ambient_audio_url ?? "",
    transcript: experience.transcript ?? "",
    runtime_seconds: experience.runtime_seconds ?? 0,
    featured_image: experience.featured_image ?? "",
    mobile_image: experience.mobile_image ?? "",
    cinematic_bg: experience.cinematic_bg ?? "",
    social_image: experience.social_image ?? "",
  });
  const update = useUpdateExperience();
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleUpload = async (field: keyof typeof form, file: File) => {
    try {
      setUploadingField(field as string);
      const { url } = await uploadExperienceFile(file, experience.id);
      set(field, url);
      toast.success("Uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploadingField(null);
    }
  };

  const save = async () => {
    try {
      await update.mutateAsync({ id: experience.id, ...form } as any);
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Video Provider">
          <Select value={form.video_provider} onValueChange={(v) => set("video_provider", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="url">Direct URL / MP4</SelectItem>
              <SelectItem value="mux">Mux</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="vimeo">Vimeo</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Playback ID (Mux/YT/Vimeo)">
          <Input value={form.video_playback_id} onChange={(e) => set("video_playback_id", e.target.value)} />
        </Field>
        <UploadableUrl label="Main Video URL" value={form.video_url} field="video_url"
          onChange={(v) => set("video_url", v)} uploading={uploadingField === "video_url"}
          onFile={(f) => handleUpload("video_url", f)} accept="video/*" />
        <UploadableUrl label="Trailer URL" value={form.trailer_url} field="trailer_url"
          onChange={(v) => set("trailer_url", v)} uploading={uploadingField === "trailer_url"}
          onFile={(f) => handleUpload("trailer_url", f)} accept="video/*" />
        <UploadableUrl label="Poster Image" value={form.poster_url} field="poster_url"
          onChange={(v) => set("poster_url", v)} uploading={uploadingField === "poster_url"}
          onFile={(f) => handleUpload("poster_url", f)} accept="image/*" />
        <UploadableUrl label="Featured Image" value={form.featured_image} field="featured_image"
          onChange={(v) => set("featured_image", v)} uploading={uploadingField === "featured_image"}
          onFile={(f) => handleUpload("featured_image", f)} accept="image/*" />
        <UploadableUrl label="Mobile Image" value={form.mobile_image} field="mobile_image"
          onChange={(v) => set("mobile_image", v)} uploading={uploadingField === "mobile_image"}
          onFile={(f) => handleUpload("mobile_image", f)} accept="image/*" />
        <UploadableUrl label="Cinematic Background" value={form.cinematic_bg} field="cinematic_bg"
          onChange={(v) => set("cinematic_bg", v)} uploading={uploadingField === "cinematic_bg"}
          onFile={(f) => handleUpload("cinematic_bg", f)} accept="image/*,video/*" />
        <UploadableUrl label="Ambient Audio" value={form.ambient_audio_url} field="ambient_audio_url"
          onChange={(v) => set("ambient_audio_url", v)} uploading={uploadingField === "ambient_audio_url"}
          onFile={(f) => handleUpload("ambient_audio_url", f)} accept="audio/*" />
        <UploadableUrl label="Captions (VTT)" value={form.captions_url} field="captions_url"
          onChange={(v) => set("captions_url", v)} uploading={uploadingField === "captions_url"}
          onFile={(f) => handleUpload("captions_url", f)} accept=".vtt,text/vtt" />
        <UploadableUrl label="Social Share Image" value={form.social_image} field="social_image"
          onChange={(v) => set("social_image", v)} uploading={uploadingField === "social_image"}
          onFile={(f) => handleUpload("social_image", f)} accept="image/*" />
        <Field label="Runtime (seconds)">
          <Input type="number" value={form.runtime_seconds} onChange={(e) => set("runtime_seconds", Number(e.target.value))} />
        </Field>
      </div>
      <Field label="Transcript">
        <Textarea rows={5} value={form.transcript} onChange={(e) => set("transcript", e.target.value)} />
      </Field>
      <div className="flex justify-end">
        <Button onClick={save} disabled={update.isPending}>
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save Video
        </Button>
      </div>
    </Card>
  );
}

function UploadableUrl({
  label, value, onChange, onFile, accept, uploading,
}: {
  label: string; value: string; field: string; onChange: (v: string) => void;
  onFile: (f: File) => void; accept: string; uploading: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://..." />
        <input ref={ref} type="file" accept={accept} className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
      </div>
    </Field>
  );
}

/* -------------------- Media Library -------------------- */
function MediaPanel({ experienceId }: { experienceId: string }) {
  const { data: items = [], isLoading } = useExperienceMedia(experienceId);
  const add = useAddMedia();
  const del = useDeleteMedia();
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const kind = file.type.startsWith("video") ? "video"
          : file.type.startsWith("audio") ? "audio"
          : file.type.startsWith("image") ? "image" : "file";
        const { url, path } = await uploadExperienceFile(file, experienceId);
        await add.mutateAsync({
          experience_id: experienceId, kind, url, storage_path: path, mime: file.type, title: file.name,
        });
      }
      toast.success("Uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">Media Library</h3>
          <p className="text-xs text-muted-foreground">Images, audio, and video used by scenes.</p>
        </div>
        <div>
          <input ref={ref} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
          <Button size="sm" onClick={() => ref.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
            Upload
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">No media yet.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((m) => (
            <div key={m.id} className="group relative rounded-md border overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center">
                {m.kind === "image" ? (
                  <img src={m.url} alt={m.title ?? ""} className="h-full w-full object-cover" loading="lazy" />
                ) : m.kind === "video" ? (
                  <video src={m.url} className="h-full w-full object-cover" />
                ) : (
                  <div className="text-xs text-muted-foreground p-2 text-center">{m.kind}</div>
                )}
              </div>
              <div className="p-2 text-xs truncate">{m.title ?? m.url}</div>
              <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={() => del.mutate({ id: m.id, experience_id: experienceId })}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* -------------------- Scenes -------------------- */
function ScenesPanel({ experienceId }: { experienceId: string }) {
  const { data: scenes = [], isLoading } = useScenes(experienceId);
  const create = useCreateScene();
  const update = useUpdateScene();
  const del = useDeleteScene();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && scenes[0]) setSelectedId(scenes[0].id);
  }, [scenes, selectedId]);

  const selected = scenes.find((s) => s.id === selectedId) ?? null;

  const addScene = () => {
    create.mutate(
      {
        experience_id: experienceId,
        order_index: scenes.length,
        scene_type: "content",
        title: `Scene ${scenes.length + 1}`,
        enabled: true,
      },
      { onSuccess: (s) => setSelectedId(s.id) }
    );
  };

  const move = (scene: ExperienceScene, dir: -1 | 1) => {
    const idx = scenes.findIndex((s) => s.id === scene.id);
    const swap = scenes[idx + dir];
    if (!swap) return;
    update.mutate({ id: scene.id, order_index: swap.order_index });
    update.mutate({ id: swap.id, order_index: scene.order_index });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Scenes</span>
          <Button size="sm" variant="outline" onClick={addScene} disabled={create.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin mx-auto my-4 text-muted-foreground" />
        ) : scenes.length === 0 ? (
          <div className="text-xs text-muted-foreground py-4 text-center">No scenes yet.</div>
        ) : (
          <ul className="space-y-1">
            {scenes.map((s, i) => (
              <li key={s.id}>
                <button
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                    selectedId === s.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}
                >
                  <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                  <span className="flex-1 truncate">{s.title || s.heading || `Scene ${i + 1}`}</span>
                  {!s.enabled && <Badge variant="outline" className="text-[10px]">off</Badge>}
                </button>
                <div className="flex justify-end gap-0.5 pr-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(s, -1)} disabled={i === 0}>
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(s, 1)} disabled={i === scenes.length - 1}>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                    onClick={() => del.mutate({ id: s.id, experience_id: experienceId })}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div>
        {selected ? <SceneEditor scene={selected} /> : <Card className="p-6 text-center text-sm text-muted-foreground">Select or add a scene.</Card>}
      </div>
    </div>
  );
}

function SceneEditor({ scene }: { scene: ExperienceScene }) {
  const [form, setForm] = useState({ ...scene });
  const update = useUpdateScene();
  useEffect(() => setForm({ ...scene }), [scene.id]);
  const set = <K extends keyof ExperienceScene>(k: K, v: ExperienceScene[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    try {
      await update.mutateAsync({
        id: scene.id,
        title: form.title, internal_label: form.internal_label,
        scene_type: form.scene_type, start_ts: form.start_ts, end_ts: form.end_ts,
        heading: form.heading, body: form.body, scripture: form.scripture, scripture_ref: form.scripture_ref,
        quote: form.quote, background_url: form.background_url, background_kind: form.background_kind,
        ambient_audio_url: form.ambient_audio_url, animation: form.animation, transition: form.transition,
        overlay_opacity: form.overlay_opacity, text_align: form.text_align, enabled: form.enabled,
      });
      toast.success("Scene saved");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title"><Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Internal Label"><Input value={form.internal_label ?? ""} onChange={(e) => set("internal_label", e.target.value)} /></Field>
        <Field label="Scene Type">
          <Select value={form.scene_type} onValueChange={(v) => set("scene_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="content">Content</SelectItem>
              <SelectItem value="intro">Intro</SelectItem>
              <SelectItem value="scripture">Scripture</SelectItem>
              <SelectItem value="quote">Quote</SelectItem>
              <SelectItem value="reflection">Reflection</SelectItem>
              <SelectItem value="prayer">Prayer</SelectItem>
              <SelectItem value="cta">Call to Action</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Text Align">
          <Select value={form.text_align ?? "center"} onValueChange={(v) => set("text_align", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Start (sec)">
          <Input type="number" step="0.1" value={form.start_ts ?? ""} onChange={(e) => set("start_ts", e.target.value === "" ? null : Number(e.target.value))} />
        </Field>
        <Field label="End (sec)">
          <Input type="number" step="0.1" value={form.end_ts ?? ""} onChange={(e) => set("end_ts", e.target.value === "" ? null : Number(e.target.value))} />
        </Field>
      </div>
      <Field label="Heading"><Input value={form.heading ?? ""} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Body"><Textarea rows={3} value={form.body ?? ""} onChange={(e) => set("body", e.target.value)} /></Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Scripture"><Textarea rows={2} value={form.scripture ?? ""} onChange={(e) => set("scripture", e.target.value)} /></Field>
        <Field label="Scripture Reference"><Input value={form.scripture_ref ?? ""} onChange={(e) => set("scripture_ref", e.target.value)} /></Field>
      </div>
      <Field label="Quote"><Textarea rows={2} value={form.quote ?? ""} onChange={(e) => set("quote", e.target.value)} /></Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Background URL"><Input value={form.background_url ?? ""} onChange={(e) => set("background_url", e.target.value)} placeholder="image or video url" /></Field>
        <Field label="Background Kind">
          <Select value={form.background_kind ?? "image"} onValueChange={(v) => set("background_kind", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="color">Solid Color</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Ambient Audio URL"><Input value={form.ambient_audio_url ?? ""} onChange={(e) => set("ambient_audio_url", e.target.value)} /></Field>
        <Field label="Animation">
          <Select value={form.animation ?? "fade"} onValueChange={(v) => set("animation", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fade">Fade</SelectItem>
              <SelectItem value="slide">Slide</SelectItem>
              <SelectItem value="zoom">Zoom</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label={`Overlay Opacity (${((form.overlay_opacity ?? 0.4) as number).toFixed(2)})`}>
        <Slider value={[(form.overlay_opacity ?? 0.4) * 100]} min={0} max={100} step={5}
          onValueChange={(v) => set("overlay_opacity", v[0] / 100)} />
      </Field>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} /> Enabled
        </label>
        <Button onClick={save} disabled={update.isPending}>
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save Scene
        </Button>
      </div>
    </Card>
  );
}

/* -------------------- Interactions -------------------- */
function InteractionsPanel({ experienceId }: { experienceId: string }) {
  const { data: items = [], isLoading } = useInteractions(experienceId);
  const create = useCreateInteraction();
  const update = useUpdateInteraction();
  const del = useDeleteInteraction();

  const add = () => {
    create.mutate({ experience_id: experienceId, kind: "cta", heading: "New Interaction", button_label: "Continue" });
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">Interactions</h3>
          <p className="text-xs text-muted-foreground">Prayer prompts, CTAs, responses, decisions.</p>
        </div>
        <Button size="sm" onClick={add} disabled={create.isPending}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      {isLoading ? (
        <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">No interactions yet.</div>
      ) : (
        <div className="space-y-3">
          {items.map((i) => <InteractionRow key={i.id} interaction={i} onSave={(patch) => update.mutate({ id: i.id, ...patch })}
            onDelete={() => del.mutate({ id: i.id, experience_id: experienceId })} />)}
        </div>
      )}
    </Card>
  );
}

function InteractionRow({
  interaction, onSave, onDelete,
}: {
  interaction: ExperienceInteraction;
  onSave: (patch: Partial<ExperienceInteraction>) => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({ ...interaction });
  useEffect(() => setForm({ ...interaction }), [interaction.id]);
  const set = <K extends keyof ExperienceInteraction>(k: K, v: ExperienceInteraction[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Kind">
          <Select value={form.kind} onValueChange={(v) => set("kind", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cta">Call to Action</SelectItem>
              <SelectItem value="prayer">Prayer Prompt</SelectItem>
              <SelectItem value="response">Response</SelectItem>
              <SelectItem value="reflection">Reflection</SelectItem>
              <SelectItem value="decision">Decision</SelectItem>
              <SelectItem value="share">Share</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Appear (sec)"><Input type="number" step="0.1" value={form.appear_ts ?? ""} onChange={(e) => set("appear_ts", e.target.value === "" ? null : Number(e.target.value))} /></Field>
        <Field label="Expire (sec)"><Input type="number" step="0.1" value={form.expire_ts ?? ""} onChange={(e) => set("expire_ts", e.target.value === "" ? null : Number(e.target.value))} /></Field>
        <Field label="Button Label"><Input value={form.button_label ?? ""} onChange={(e) => set("button_label", e.target.value)} /></Field>
      </div>
      <Field label="Heading"><Input value={form.heading ?? ""} onChange={(e) => set("heading", e.target.value)} /></Field>
      <Field label="Body"><Textarea rows={2} value={form.body ?? ""} onChange={(e) => set("body", e.target.value)} /></Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Destination (URL/path)"><Input value={form.destination ?? ""} onChange={(e) => set("destination", e.target.value)} /></Field>
        <Field label="Confirmation Message"><Input value={form.confirmation ?? ""} onChange={(e) => set("confirmation", e.target.value)} /></Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <Switch checked={form.required} onCheckedChange={(v) => set("required", v)} /> Required
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={form.anonymous_allowed} onCheckedChange={(v) => set("anonymous_allowed", v)} /> Allow anonymous
          </label>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" onClick={onDelete}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
          <Button size="sm" onClick={() => onSave({
            kind: form.kind, heading: form.heading, body: form.body,
            appear_ts: form.appear_ts, expire_ts: form.expire_ts, button_label: form.button_label,
            destination: form.destination, confirmation: form.confirmation, required: form.required,
            anonymous_allowed: form.anonymous_allowed,
          })}><Save className="h-4 w-4 mr-1" />Save</Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Preview -------------------- */
function PreviewPanel({ experience }: { experience: ImmersiveExperience }) {
  const { data: scenes = [] } = useScenes(experience.id);
  const [idx, setIdx] = useState(0);
  const active = useMemo(() => scenes.filter((s) => s.enabled), [scenes]);
  const scene = active[idx];

  useEffect(() => { setIdx(0); }, [experience.id, active.length]);

  if (active.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        Add and enable scenes to preview the experience.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-black text-white">
        {scene?.background_url && scene.background_kind === "video" ? (
          <video src={scene.background_url} autoPlay muted loop className="absolute inset-0 h-full w-full object-cover" />
        ) : scene?.background_url ? (
          <img src={scene.background_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : experience.cinematic_bg ? (
          <img src={experience.cinematic_bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${scene?.overlay_opacity ?? 0.4})` }} />
        <div className={`relative z-10 h-full w-full flex flex-col items-center justify-center p-8 text-${scene?.text_align ?? "center"}`}>
          {scene?.heading && <h3 className="font-display text-3xl md:text-5xl font-semibold mb-4 max-w-3xl">{scene.heading}</h3>}
          {scene?.scripture && (
            <blockquote className="text-lg italic max-w-2xl mb-2">"{scene.scripture}"</blockquote>
          )}
          {scene?.scripture_ref && <div className="text-sm opacity-80 mb-4">— {scene.scripture_ref}</div>}
          {scene?.quote && <div className="text-lg italic max-w-2xl mb-4">{scene.quote}</div>}
          {scene?.body && <p className="text-base opacity-90 max-w-2xl">{scene.body}</p>}
        </div>
      </div>
      <div className="flex items-center justify-between p-3 border-t bg-muted/30">
        <Button size="sm" variant="outline" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">Scene {idx + 1} of {active.length}</span>
        <Button size="sm" onClick={() => setIdx((i) => Math.min(active.length - 1, i + 1))} disabled={idx === active.length - 1}>
          Next
        </Button>
      </div>
    </Card>
  );
}
