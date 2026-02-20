import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAIDev } from "@/hooks/useAIDev";
import { ClipboardList, Search, CheckCircle, Clock, Upload, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AIDevDashboard() {
  const { listPlans, getAudit, listDeployments, getSettings, loading } = useAIDev();
  const [stats, setStats] = useState({ total: 0, approved: 0, scans: 0, recent: [] as any[] });
  const [deployStats, setDeployStats] = useState({
    stagingConfigured: false,
    productionConfigured: false,
    lastStaging: null as any,
    lastProduction: null as any,
  });

  useEffect(() => {
    (async () => {
      const [plans, audit, stagingDeploys, prodDeploys, settings] = await Promise.all([
        listPlans(),
        getAudit(),
        listDeployments("staging", "push"),
        listDeployments("production", "push"),
        getSettings(),
      ]);
      const p = plans || [];
      const a = audit || [];
      setStats({
        total: p.length,
        approved: p.filter((x: any) => x.status === "approved").length,
        scans: a.filter((x: any) => x.action === "scan_run").length,
        recent: a.slice(0, 10),
      });

      const settingsMap: Record<string, string> = {};
      if (settings) (settings as any[]).forEach((s: any) => { settingsMap[s.key] = s.value; });

      setDeployStats({
        stagingConfigured: !!settingsMap.staging_agent_url,
        productionConfigured: !!settingsMap.production_agent_url,
        lastStaging: stagingDeploys?.[0] || null,
        lastProduction: prodDeploys?.[0] || null,
      });
    })();
  }, []);

  const cards = [
    { label: "Total Plans", value: stats.total, icon: ClipboardList },
    { label: "Approved", value: stats.approved, icon: CheckCircle },
    { label: "Scans Run", value: stats.scans, icon: Search },
  ];

  const statusColor = (s: string) => {
    if (s === "success") return "default";
    if (s === "failed") return "destructive";
    return "secondary";
  };

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

      {/* Deployment Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Staging Status</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${deployStats.stagingConfigured ? "bg-primary" : "bg-destructive"}`} />
              <span className="text-sm">{deployStats.stagingConfigured ? "Configured" : "Not configured"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Live Status</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${deployStats.productionConfigured ? "bg-primary" : "bg-destructive"}`} />
              <span className="text-sm">{deployStats.productionConfigured ? "Configured" : "Not configured"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Staging Deploy</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {deployStats.lastStaging ? (
              <div className="space-y-1">
                <Badge variant={statusColor(deployStats.lastStaging.status)}>{deployStats.lastStaging.status}</Badge>
                <p className="text-xs text-muted-foreground">{deployStats.lastStaging.version_tag?.slice(0, 19)}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">None</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Live Version</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {deployStats.lastProduction ? (
              <div className="space-y-1">
                <Badge variant={statusColor(deployStats.lastProduction.status)}>{deployStats.lastProduction.status}</Badge>
                <p className="text-xs text-muted-foreground">{deployStats.lastProduction.version_tag?.slice(0, 19)}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">None</p>
            )}
          </CardContent>
        </Card>
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
