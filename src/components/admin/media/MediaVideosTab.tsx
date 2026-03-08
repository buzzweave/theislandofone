import { useState, useRef } from "react";
import { useMediaVideos, useUploadVideo } from "@/hooks/useMediaLibrary";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Upload, Trash2, Download, Pencil, Video, Play } from "lucide-react";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function MediaVideosTab({ orgId }: { orgId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: videos = [], refetch } = useMediaVideos(orgId);
  const uploadMutation = useUploadVideo(orgId);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: File[]) => {
    const valid = files.filter((f) => /^video\/(mp4|quicktime|webm|mov)$/i.test(f.type) || f.name.match(/\.(mp4|mov|webm)$/i));
    if (valid.length === 0) { toast({ title: "No valid video files", variant: "destructive" }); return; }
    setUploading(true);
    for (let i = 0; i < valid.length; i++) {
      setUploadPercent(((i + 1) / valid.length) * 100);
      try {
        await uploadMutation.mutateAsync(valid[i]);
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      }
    }
    toast({ title: `${valid.length} video(s) uploaded` });
    setUploading(false);
    setUploadPercent(0);
    refetch();
  };

  const handleDelete = async (video: typeof videos[0]) => {
    if (!confirm("Delete this video?")) return;
    await supabase.storage.from("workspace-media").remove([video.file_path]);
    await supabase.from("media_videos").delete().eq("id", video.id);
    refetch();
    toast({ title: "Video deleted" });
  };

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return;
    await supabase.from("media_videos").update({ title: renameValue.trim() }).eq("id", id);
    setRenamingId(null);
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Videos</h3>
        <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4 mr-1" />
          {uploading ? "Uploading…" : "Upload Video"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) handleUpload(files);
            e.target.value = "";
          }}
        />
      </div>

      {uploading && <Progress value={uploadPercent} className="h-2" />}

      {videos.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-border p-12 text-center text-muted-foreground">
          <Video className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No videos yet. Upload MP4, MOV, or WebM files.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <div key={video.id} className="rounded-lg border border-border bg-card overflow-hidden">
              {/* Video preview / player */}
              <div className="relative aspect-video bg-muted">
                {playingId === video.id ? (
                  <video
                    src={(video as any).url}
                    controls
                    autoPlay
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <button
                    className="w-full h-full flex items-center justify-center bg-muted/80 hover:bg-muted transition-colors"
                    onClick={() => setPlayingId(video.id)}
                  >
                    <Play className="h-10 w-10 text-primary" />
                  </button>
                )}
              </div>
              <div className="p-3 space-y-2">
                {renamingId === video.id ? (
                  <div className="flex gap-1">
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename(video.id)}
                      className="h-7 text-xs"
                      autoFocus
                    />
                    <Button size="sm" className="h-7 text-xs" onClick={() => handleRename(video.id)}>Save</Button>
                  </div>
                ) : (
                  <p className="text-sm font-medium truncate">{video.title || video.file_name}</p>
                )}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{formatSize(video.file_size)}</span>
                  <span>{new Date(video.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-1 pt-1 border-t border-border">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setRenamingId(video.id); setRenameValue(video.title); }}>
                    <Pencil className="h-3 w-3 mr-1" /> Rename
                  </Button>
                  <a
                    href={(video as any).url}
                    download={video.file_name}
                    className="inline-flex items-center gap-1 h-7 px-2 text-xs rounded-md hover:bg-accent transition-colors"
                  >
                    <Download className="h-3 w-3" /> Download
                  </a>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive ml-auto" onClick={() => handleDelete(video)}>
                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
