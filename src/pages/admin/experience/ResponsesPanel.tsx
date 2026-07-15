import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";
import { useExperienceResponses } from "@/hooks/useExperienceResponses";
import { useInteractions } from "@/hooks/useExperienceInteractions";
import { useMemo } from "react";

export default function ResponsesPanel({ experienceId }: { experienceId: string }) {
  const { data: responses = [], isLoading } = useExperienceResponses(experienceId);
  const { data: interactions = [] } = useInteractions(experienceId);

  const interactionMap = useMemo(() => {
    const m: Record<string, string> = {};
    interactions.forEach((i) => { m[i.id] = i.heading || i.name || i.kind; });
    return m;
  }, [interactions]);

  const summary = useMemo(() => {
    const by: Record<string, number> = {};
    responses.forEach((r) => { by[r.kind] = (by[r.kind] ?? 0) + 1; });
    return by;
  }, [responses]);

  if (isLoading) {
    return <Card className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></Card>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4" />
        {responses.length} total response{responses.length === 1 ? "" : "s"}
      </div>
      {Object.keys(summary).length > 0 && (
        <Card className="p-4 flex flex-wrap gap-3">
          {Object.entries(summary).map(([k, v]) => (
            <Badge key={k} variant="secondary">{k}: {v}</Badge>
          ))}
        </Card>
      )}
      {responses.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">No responses yet.</Card>
      ) : responses.map((r) => (
        <Card key={r.id} className="p-4 space-y-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge>{r.kind}</Badge>
              {r.interaction_id && <span className="text-xs text-muted-foreground">
                {interactionMap[r.interaction_id] || "—"}
              </span>}
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(r.created_at).toLocaleString()}
            </span>
          </div>
          {r.payload && Object.keys(r.payload).length > 0 && (
            <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap">
              {JSON.stringify(r.payload, null, 2)}
            </pre>
          )}
        </Card>
      ))}
    </div>
  );
}
