import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAIDev } from "@/hooks/useAIDev";
import { useToast } from "@/hooks/use-toast";
import { Check, X, ChevronDown, ChevronUp } from "lucide-react";

export default function AIDevPlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { listPlans, approvePlan, rejectPlan, loading } = useAIDev();
  const { toast } = useToast();

  const load = async () => {
    const data = await listPlans();
    if (data) setPlans(data);
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id: string) => {
    const res = await approvePlan(id);
    if (res) { toast({ title: "Plan approved" }); load(); }
  };

  const handleReject = async (id: string) => {
    const res = await rejectPlan(id);
    if (res) { toast({ title: "Plan rejected" }); load(); }
  };

  const statusVariant = (s: string) => {
    if (s === "approved") return "default";
    if (s === "rejected") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold">Plans</h2>

      {plans.length === 0 && !loading && (
        <p className="text-muted-foreground text-sm">No plans yet. Generate one from the AI Console.</p>
      )}

      {plans.map((p) => (
        <Card key={p.id}>
          <CardHeader
            className="cursor-pointer flex flex-row items-center justify-between"
            onClick={() => setExpanded(expanded === p.id ? null : p.id)}
          >
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-sm truncate">{p.plan?.summary || p.prompt?.slice(0, 60)}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {p.mode.replace(/_/g, " ")} · {new Date(p.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
              {expanded === p.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
          {expanded === p.id && (
            <CardContent className="space-y-4">
              <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-80 whitespace-pre-wrap">
                {JSON.stringify(p.plan, null, 2)}
              </pre>
              {p.status === "draft" && (
                <div className="flex gap-2">
                  <Button onClick={() => handleApprove(p.id)} disabled={loading} size="sm">
                    <Check className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button onClick={() => handleReject(p.id)} disabled={loading} variant="destructive" size="sm">
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
