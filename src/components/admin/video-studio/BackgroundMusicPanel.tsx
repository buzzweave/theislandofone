import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Music, Upload, Trash2, Tag, Edit2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MUSIC_TAGS = ["Ambient", "Worship", "Cinematic", "Reflective", "Intercession", "Epic", "Lo-Fi", "Documentary"];

export interface MusicTrack {
  id: string;
  name: string;
  url: string;
  tag: string;
  size: number;
  uploadedAt: string;
}

export interface MusicSettings {
  enabled: boolean;
  selectedTrackUrl: string;
  loop: boolean;
  fadeIn: number;
  fadeOut: number;
  volume: number;
}

interface BackgroundMusicPanelProps {
  settings: MusicSettings;
  onChange: (settings: MusicSettings) => void;
}

export default function BackgroundMusicPanel({ settings, onChange }: BackgroundMusicPanelProps) {
  const { toast } = useToast();
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Load tracks from storage
  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    try {
      const { data, error } = await supabase.storage.from("audio-files").list("user-music", {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error || !data) return;

      const loaded: MusicTrack[] = data
        .filter((f) => f.name.endsWith(".mp3") || f.name.endsWith(".wav"))
        .map((f) => {
          const { data: pub } = supabase.storage.from("audio-files").getPublicUrl(`user-music/${f.name}`);
          // Parse metadata from filename: tag--displayname.ext
          const parts = f.name.replace(/\.[^.]+$/, "").split("--");
          const tag = parts.length > 1 ? parts[0] : "Ambient";
          const displayName = parts.length > 1 ? parts.slice(1).join("--") : parts[0];
          return {
            id: f.id || f.name,
            name: displayName.replace(/-/g, " "),
            url: pub.publicUrl,
            tag,
            size: (f.metadata as any)?.size || 0,
            uploadedAt: f.created_at || "",
          };
        });
      setTracks(loaded);

      // Auto-hide if no tracks
      if (loaded.length === 0 && settings.enabled) {
        onChange({ ...settings, enabled: false, selectedTrackUrl: "" });
      }
    } catch (e) {
      console.warn("Failed to load music tracks:", e);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("audio/mpeg") && !file.type.includes("audio/wav") && !file.type.includes("audio/x-wav")) {
      toast({ title: "Invalid Format", description: "Only MP3 and WAV files are supported.", variant: "destructive" });
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Maximum file size is 25MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "mp3";
      const safeName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-");
      const fileName = `Ambient--${safeName}-${Date.now()}.${ext}`;

      const { error } = await supabase.storage.from("audio-files").upload(`user-music/${fileName}`, file, {
        contentType: file.type,
        upsert: true,
      });

      if (error) throw error;

      toast({ title: "Track Uploaded", description: file.name });
      await loadTracks();
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const deleteTrack = async (track: MusicTrack) => {
    // Reconstruct the storage path
    const matchingFile = tracks.find((t) => t.id === track.id);
    if (!matchingFile) return;

    // Find actual filename in storage
    const { data: files } = await supabase.storage.from("audio-files").list("user-music");
    const file = files?.find((f) => {
      const { data: pub } = supabase.storage.from("audio-files").getPublicUrl(`user-music/${f.name}`);
      return pub.publicUrl === track.url;
    });

    if (file) {
      await supabase.storage.from("audio-files").remove([`user-music/${file.name}`]);
    }

    if (settings.selectedTrackUrl === track.url) {
      onChange({ ...settings, selectedTrackUrl: "", enabled: false });
    }
    await loadTracks();
    toast({ title: "Track Deleted" });
  };

  const renameTrack = async (track: MusicTrack) => {
    if (!editName.trim()) return;

    const { data: files } = await supabase.storage.from("audio-files").list("user-music");
    const file = files?.find((f) => {
      const { data: pub } = supabase.storage.from("audio-files").getPublicUrl(`user-music/${f.name}`);
      return pub.publicUrl === track.url;
    });

    if (file) {
      const ext = file.name.split(".").pop();
      const newName = `${track.tag}--${editName.replace(/\s+/g, "-")}-${Date.now()}.${ext}`;

      // Download and re-upload with new name
      const { data: blob } = await supabase.storage.from("audio-files").download(`user-music/${file.name}`);
      if (blob) {
        await supabase.storage.from("audio-files").upload(`user-music/${newName}`, blob, { upsert: true });
        await supabase.storage.from("audio-files").remove([`user-music/${file.name}`]);
      }
    }

    setEditingId(null);
    setEditName("");
    await loadTracks();
    toast({ title: "Track Renamed" });
  };

  const update = (partial: Partial<MusicSettings>) => onChange({ ...settings, ...partial });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Music className="h-4 w-4" /> Background Music
          <Badge variant="secondary" className="ml-auto text-[10px]">{tracks.length} tracks</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload */}
        <label className="block">
          <input type="file" accept=".mp3,.wav" onChange={handleUpload} className="hidden" disabled={uploading} />
          <Button variant="outline" size="sm" className="w-full gap-2" disabled={uploading} asChild>
            <span>
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Uploading…" : "Upload MP3 / WAV (max 25MB)"}
            </span>
          </Button>
        </label>

        {/* Track List */}
        {tracks.length > 0 && (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {tracks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 p-2 rounded-md border border-border text-xs group">
                <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
                {editingId === t.id ? (
                  <div className="flex items-center gap-1 flex-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-6 text-xs"
                      autoFocus
                    />
                    <button onClick={() => renameTrack(t)} className="text-green-500 hover:text-green-400">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 truncate">{t.name}</span>
                    <Badge variant="outline" className="text-[9px] shrink-0">{t.tag}</Badge>
                    <button
                      onClick={() => { setEditingId(t.id); setEditName(t.name); }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => deleteTrack(t)}
                      className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Toggle ON/OFF */}
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Background Music</Label>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(v) => update({ enabled: v })}
            disabled={tracks.length === 0}
          />
        </div>

        {settings.enabled && tracks.length > 0 && (
          <div className="space-y-3 pt-1">
            {/* Select Track */}
            <div className="space-y-1.5">
              <Label className="text-xs">Select Track</Label>
              <Select value={settings.selectedTrackUrl} onValueChange={(v) => update({ selectedTrackUrl: v })}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Choose a track…" /></SelectTrigger>
                <SelectContent>
                  {tracks.map((t) => (
                    <SelectItem key={t.id} value={t.url} className="text-xs">
                      {t.name} ({t.tag})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            {settings.selectedTrackUrl && (
              <audio controls src={settings.selectedTrackUrl} className="w-full h-8" />
            )}

            {/* Loop */}
            <div className="flex items-center justify-between">
              <Label className="text-xs">Loop Music</Label>
              <Switch checked={settings.loop} onCheckedChange={(v) => update({ loop: v })} />
            </div>

            {/* Volume */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label className="text-xs">Volume</Label>
                <span className="text-[10px] text-muted-foreground">{settings.volume}%</span>
              </div>
              <Slider value={[settings.volume]} onValueChange={([v]) => update({ volume: v })} min={0} max={100} step={5} />
            </div>

            {/* Fade */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label className="text-xs">Fade In</Label>
                  <span className="text-[10px] text-muted-foreground">{settings.fadeIn}s</span>
                </div>
                <Slider value={[settings.fadeIn]} onValueChange={([v]) => update({ fadeIn: v })} min={0} max={10} step={1} />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label className="text-xs">Fade Out</Label>
                  <span className="text-[10px] text-muted-foreground">{settings.fadeOut}s</span>
                </div>
                <Slider value={[settings.fadeOut]} onValueChange={([v]) => update({ fadeOut: v })} min={0} max={10} step={1} />
              </div>
            </div>
          </div>
        )}

        {tracks.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center">Upload music to enable background tracks.</p>
        )}
      </CardContent>
    </Card>
  );
}
