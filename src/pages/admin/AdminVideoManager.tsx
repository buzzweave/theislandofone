import { useState, useRef } from "react";
import { useAdminVideos, useAddVideo, useUpdateVideo, useDeleteVideo, type Video } from "@/hooks/useVideos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Video as VideoIcon, ExternalLink, Upload, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { adminFetch } from "@/lib/adminApi";

function ThumbnailUploader({ currentUrl, onUploaded }: { currentUrl: string; onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("video-thumbnails").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("video-thumbnails").getPublicUrl(path);
      onUploaded(urlData.publicUrl);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      {currentUrl && (
        <img src={currentUrl} alt="Thumbnail preview" className="w-full aspect-video object-cover rounded-md border border-border" />
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => inputRef.current?.click()} disabled={uploading}>
        <Upload className="h-4 w-4 mr-2" />
        {uploading ? "Uploading..." : currentUrl ? "Replace Thumbnail" : "Upload Thumbnail"}
      </Button>
      <p className="text-xs text-muted-foreground">Leave empty to auto-generate from YouTube URL</p>
    </div>
  );
}

const categories = ["Ministry", "Sermons", "Speaking", "Books", "Devotional"];
type VideoForm = {
  title: string;
  thumbnail: string;
  duration: string;
  category: string;
  featured: boolean;
  youtube_url: string;
  price: number;
  is_free: boolean;
};

const emptyForm: VideoForm = { title: "", thumbnail: "", duration: "", category: "Ministry", featured: false, youtube_url: "", price: 0, is_free: true };

export default function AdminVideoManager() {
  const { data: videoList = [], isLoading } = useAdminVideos();
  const addVideo = useAddVideo();
  const updateVideo = useUpdateVideo();
  const deleteVideo = useDeleteVideo();
  const { toast } = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<VideoForm>(emptyForm);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (video: Video) => {
    setEditingId(video.id);
    setForm({
      title: video.title,
      thumbnail: video.thumbnail,
      duration: video.duration,
      category: video.category,
      featured: video.featured,
      youtube_url: video.youtube_url,
      price: video.price ?? 0,
      is_free: video.is_free ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.category) return;
    try {
      if (editingId) {
        await updateVideo.mutateAsync({ id: editingId, ...form });
        toast({ title: "Video updated" });
      } else {
        await addVideo.mutateAsync({ ...form, is_active: true, sort_order: videoList.length });
        toast({ title: "Video added" });
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVideo.mutateAsync(id);
      toast({ title: "Video deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Video Manager</h2>
          <p className="text-sm text-muted-foreground">{videoList.length} videos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" /> Add Video
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Video" : "Add Video"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>YouTube URL</Label>
                <Input value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} placeholder="https://youtube.com/..." />
              </div>
              <div className="space-y-2">
                <Label>Thumbnail</Label>
                <ThumbnailUploader
                  currentUrl={form.thumbnail}
                  onUploaded={(url) => setForm({ ...form, thumbnail: url })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="12:34" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
                <Label>Featured</Label>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Switch checked={!form.is_free} onCheckedChange={(v) => setForm({ ...form, is_free: !v, price: v ? form.price : 0 })} />
                  <Label>For Sale</Label>
                </div>
                {!form.is_free && (
                  <div className="space-y-1">
                    <Label className="text-xs">Price ($)</Label>
                    <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
                  </div>
                )}
              </div>
              <Button onClick={handleSave} className="w-full" disabled={addVideo.isPending || updateVideo.isPending}>
                {editingId ? "Save Changes" : "Add Video"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : videoList.length === 0 ? (
        <p className="text-muted-foreground">No videos yet. Click "Add Video" to get started.</p>
      ) : (
        <div className="grid gap-4">
          {videoList.map((video) => (
            <Card key={video.id} className="overflow-hidden">
              <div className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${video.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                {video.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {video.is_active ? "Published — Live on site" : "Draft — Hidden from public"}
              </div>
              <div className="flex items-start gap-4 p-4">
                <div className="w-28 h-16 rounded-md overflow-hidden bg-muted shrink-0">
                  {video.thumbnail || video.youtube_url ? (
                    <img
                      src={video.thumbnail || `https://img.youtube.com/vi/${video.youtube_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/))([^?&/]+)/)?.[1]}/hqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <VideoIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{video.title}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs">{video.category}</Badge>
                    <span className="text-xs text-muted-foreground">{video.duration}</span>
                    {video.featured && <Badge className="text-xs">Featured</Badge>}
                    {!video.is_free && <Badge variant="outline" className="text-xs">${video.price}</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Button
                      variant={video.is_active ? "outline" : "default"}
                      size="sm"
                      className="text-xs"
                      onClick={() => updateVideo.mutateAsync({ id: video.id, is_active: !video.is_active }).then(() => toast({ title: video.is_active ? "Video unpublished" : "Video published" }))}
                    >
                      {video.is_active ? <><EyeOff className="h-3.5 w-3.5 mr-1.5" /> Unpublish (Draft)</> : <><Eye className="h-3.5 w-3.5 mr-1.5" /> Publish to Site</>}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => openEdit(video)}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                    </Button>
                    {video.youtube_url && (
                      <Button variant="ghost" size="sm" className="text-xs" asChild>
                        <a href={video.youtube_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View
                        </a>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 ml-auto" onClick={() => handleDelete(video.id)} disabled={deleteVideo.isPending}>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
