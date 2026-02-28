import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Film, Download, Play, Trash2, ArrowLeft, Calendar, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function VideoLibrary() {
  const { toast } = useToast();

  const { data: projects = [], refetch } = useQuery({
    queryKey: ["video_projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from("video_projects").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Video project removed." });
      refetch();
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin/video-studio">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold">Video Library</h1>
            <p className="text-sm text-muted-foreground">{projects.length} video project(s)</p>
          </div>
        </div>
        <Link to="/admin/video-studio">
          <Button className="gap-2"><Film className="h-4 w-4" /> New Video</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Film className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No videos created yet. Head to the Video Studio to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Card key={p.id} className="overflow-hidden group">
              {/* Thumbnail from first slide or video */}
              <div className="aspect-video bg-muted relative flex items-center justify-center">
                {p.video_url ? (
                  <video src={p.video_url} className="w-full h-full object-cover" muted />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center p-4"
                    style={{
                      background: (p.slides as any)?.[0]?.bg || "linear-gradient(135deg, #1a1a2e, #16213e)",
                    }}
                  >
                    <p className="text-white/70 text-xs text-center line-clamp-3">
                      {(p.slides as any)?.[0]?.text || "No preview"}
                    </p>
                  </div>
                )}
                <Badge
                  className="absolute top-2 left-2"
                  variant={p.status === "completed" ? "default" : "secondary"}
                >
                  {p.status}
                </Badge>
                {p.video_url && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-10 w-10 text-white" />
                  </div>
                )}
              </div>
              <CardContent className="pt-3 pb-3 space-y-2">
                <h3 className="font-medium text-sm truncate">{p.title || "Untitled"}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(p.created_at), "MMM d, yyyy")}
                  </span>
                  <Badge variant="outline" className="text-[10px]">{p.content_type}</Badge>
                  <Badge variant="outline" className="text-[10px]">{p.output_format}</Badge>
                </div>
                <div className="flex gap-2 pt-1">
                  {p.video_url && (
                    <Button variant="outline" size="sm" className="flex-1 gap-1" asChild>
                      <a href={p.video_url} download><Download className="h-3 w-3" /> Download</a>
                    </Button>
                  )}
                  {p.audio_url && (
                    <Button variant="outline" size="sm" className="flex-1 gap-1" asChild>
                      <a href={p.audio_url} download><Download className="h-3 w-3" /> Audio</a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteProject(p.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
