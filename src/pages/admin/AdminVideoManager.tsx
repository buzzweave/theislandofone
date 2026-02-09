import { useState } from "react";
import { videos as initialVideos } from "@/data/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Video, ExternalLink } from "lucide-react";

interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  category: string;
  featured: boolean;
  youtubeUrl?: string;
}

const categories = ["Ministry", "Sermons", "Speaking", "Books", "Devotional"];

export default function AdminVideoManager() {
  const [videoList, setVideoList] = useState<VideoItem[]>(
    initialVideos.map((v) => ({ ...v, youtubeUrl: "" }))
  );
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<VideoItem>>({});

  const openNew = () => {
    setEditingVideo(null);
    setForm({ title: "", thumbnail: "", duration: "", category: "Ministry", featured: false, youtubeUrl: "" });
    setDialogOpen(true);
  };

  const openEdit = (video: VideoItem) => {
    setEditingVideo(video);
    setForm({ ...video });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title || !form.category) return;
    if (editingVideo) {
      setVideoList((prev) =>
        prev.map((v) => (v.id === editingVideo.id ? { ...v, ...form } as VideoItem : v))
      );
    } else {
      const newVideo: VideoItem = {
        id: String(Date.now()),
        title: form.title || "",
        thumbnail: form.thumbnail || "",
        duration: form.duration || "0:00",
        category: form.category || "Ministry",
        featured: form.featured || false,
        youtubeUrl: form.youtubeUrl || "",
      };
      setVideoList((prev) => [...prev, newVideo]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setVideoList((prev) => prev.filter((v) => v.id !== id));
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
              <DialogTitle>{editingVideo ? "Edit Video" : "Add Video"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Thumbnail URL</Label>
                <Input value={form.thumbnail || ""} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input value={form.duration || ""} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="12:34" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category || "Ministry"} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>YouTube URL</Label>
                <Input value={form.youtubeUrl || ""} onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })} placeholder="https://youtube.com/..." />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.featured || false} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
                <Label>Featured</Label>
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingVideo ? "Save Changes" : "Add Video"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {videoList.map((video) => (
          <Card key={video.id} className="overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <div className="w-28 h-16 rounded-md overflow-hidden bg-muted shrink-0">
                {video.thumbnail ? (
                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{video.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">{video.category}</Badge>
                  <span className="text-xs text-muted-foreground">{video.duration}</span>
                  {video.featured && <Badge className="text-xs">Featured</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {video.youtubeUrl && (
                  <Button variant="ghost" size="icon" asChild>
                    <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => openEdit(video)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(video.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
