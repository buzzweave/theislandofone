import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAIDev } from "@/hooks/useAIDev";
import { ClipboardList, Search, CheckCircle, Clock } from "lucide-react";

export default function AIDevDashboard() {
  const { listPlans, getAudit, loading } = useAIDev();
  const [stats, setStats] = useState({ total: 0, approved: 0, scans: 0, recent: [] as any[] });

  useEffect(() => {
    (async () => {
      const [plans, audit] = await Promise.all([listPlans(), getAudit()]);
      const p = plans || [];
      const a = audit || [];
      setStats({
        total: p.length,
        approved: p.filter((x: any) => x.status === "approved").length,
        scans: a.filter((x: any) => x.action === "scan_run").length,
        recent: a.slice(0, 10),
      });
    })();
  }, []);

  const cards = [
    { label: "Total Plans", value: stats.total, icon: ClipboardList },
    { label: "Approved", value: stats.approved, icon: CheckCircle },
    { label: "Scans Run", value: stats.scans, icon: Search },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold">AI Developer Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "…" : c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.recent.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 text-sm">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium">{a.action.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground text-xs ml-auto">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
