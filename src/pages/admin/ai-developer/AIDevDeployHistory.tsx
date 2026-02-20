import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAIDev } from "@/hooks/useAIDev";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

export default function AIDevDeployHistory() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [envFilter, setEnvFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("push");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { listDeployments, loading } = useAIDev();

  const load = async () => {
    const env = envFilter === "all" ? undefined : envFilter;
    const kind = kindFilter === "all" ? undefined : kindFilter;
    const data = await listDeployments(env, kind);
    if (data) {
      setDeployments(
        statusFilter === "all" ? data : data.filter((d: any) => d.status === statusFilter)
      );
    }
  };

  useEffect(() => { load(); }, [envFilter, kindFilter, statusFilter]);

  const statusColor = (s: string) => {
    if (s === "success") return "default";
    if (s === "failed") return "destructive";
    if (s === "running") return "secondary";
    if (s === "rolled_back") return "outline";
    return "outline";
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold">Deploy History</h2>

      <div className="flex flex-wrap gap-3">
        <Select value={envFilter} onValueChange={setEnvFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Environments</SelectItem>
            <SelectItem value="staging">Staging</SelectItem>
            <SelectItem value="production">Production</SelectItem>
          </SelectContent>
        </Select>

        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Kind" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Kinds</SelectItem>
            <SelectItem value="push">Push</SelectItem>
            <SelectItem value="preview">Preview</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="rolled_back">Rolled Back</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deployments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : deployments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deployments found.</p>
          ) : (
            <div className="space-y-2">
              {deployments.map((d) => (
                <div key={d.id} className="border border-border rounded-md">
                  <button
                    onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <Badge variant={statusColor(d.status)} className="text-xs">{d.status}</Badge>
                    <Badge variant="outline" className="text-xs">{d.environment}</Badge>
                    <Badge variant="outline" className="text-xs">{d.kind}</Badge>
                    <span className="text-muted-foreground font-mono text-xs">{d.version_tag?.slice(0, 19)}</span>
                    <span className="text-muted-foreground text-xs font-mono ml-auto mr-2">{d.plan_id?.slice(0, 8)}</span>
                    <span className="text-muted-foreground text-xs">{new Date(d.created_at).toLocaleString()}</span>
                    {expandedId === d.id ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                  {expandedId === d.id && (
                    <div className="px-3 pb-3 space-y-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Request Payload</p>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(d.request_payload, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Response Payload</p>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(d.response_payload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
