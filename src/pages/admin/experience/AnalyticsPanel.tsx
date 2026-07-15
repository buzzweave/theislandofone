import { Card } from "@/components/ui/card";
import { Loader2, Eye, CheckCircle2, MousePointerClick, Clock, Users } from "lucide-react";
import { useExperienceAnalytics } from "@/hooks/useExperienceAnalytics";
import { Badge } from "@/components/ui/badge";

export default function AnalyticsPanel({ experienceId }: { experienceId: string }) {
  const { data, isLoading } = useExperienceAnalytics(experienceId);

  if (isLoading || !data) {
    return (
      <Card className="p-10 text-center">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
      </Card>
    );
  }

  const fmtSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}m ${sec}s`;
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Stat icon={Eye} label="Total Views" value={data.views} />
        <Stat icon={Users} label="Unique Viewers" value={data.uniqueViewers} />
        <Stat icon={CheckCircle2} label="Completions" value={data.completes}
          hint={`${Math.round(data.completionRate * 100)}%`} />
        <Stat icon={Clock} label="Avg. Watch" value={fmtSec(data.avgWatchSeconds)} />
        <Stat icon={MousePointerClick} label="Interactions" value={data.interactionClicks} />
      </div>

      <Card className="p-4">
        <h3 className="font-display text-lg font-semibold mb-3">Recent Events</h3>
        {data.events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No activity yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground text-left">
                <tr>
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Kind</th>
                  <th className="py-2 pr-4">Viewer</th>
                  <th className="py-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.events.slice(0, 50).map((e) => (
                  <tr key={e.id}>
                    <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                      {new Date(e.ts).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4"><Badge variant="outline">{e.kind}</Badge></td>
                    <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                      {e.user_id ? e.user_id.slice(0, 8) : e.anon_id?.slice(0, 8) ?? "—"}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground truncate max-w-xs">
                      {Object.keys(e.payload ?? {}).length > 0 ? JSON.stringify(e.payload) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data.responses.length > 0 && (
        <Card className="p-4">
          <h3 className="font-display text-lg font-semibold mb-3">Responses</h3>
          <ul className="space-y-2">
            {data.responses.slice(0, 30).map((r) => (
              <li key={r.id} className="text-sm border rounded p-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{r.kind}</Badge>
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                </div>
                {r.payload && Object.keys(r.payload).length > 0 && (
                  <pre className="mt-1 text-xs bg-muted/40 rounded p-2 overflow-x-auto">{JSON.stringify(r.payload, null, 2)}</pre>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: any; label: string; value: any; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-2xl font-display font-semibold">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
    </Card>
  );
}
