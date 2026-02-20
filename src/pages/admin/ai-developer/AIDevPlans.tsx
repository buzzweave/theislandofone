import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAIDev } from "@/hooks/useAIDev";
import { useToast } from "@/hooks/use-toast";
import { Check, X, ChevronRight } from "lucide-react";

const STATUS_VARIANT: Record<string, string> = {
  draft: "secondary",
  approved: "default",
  applied: "default",
  failed: "destructive",
  rolled_back: "outline",
  rejected: "destructive",
};

export default function AIDevPlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const { listPlans, approvePlan, rejectPlan, loading } = useAIDev();
  const { toast } = useToast();
  const navigate = useNavigate();

  const load = async () => {
    const data = await listPlans();
    if (data) setPlans(data);
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const res = await approvePlan(id);
    if (res) { toast({ title: "Plan approved" }); load(); }
  };

  const handleReject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const res = await rejectPlan(id);
    if (res) { toast({ title: "Plan rejected" }); load(); }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold">Plans</h2>

      {plans.length === 0 && !loading && (
        <p className="text-muted-foreground text-sm">No plans yet. Generate one from the AI Console.</p>
      )}

      {plans.map((p) => {
        const changeCount = p.plan?.changes?.length || 0;
        return (
          <Card
            key={p.id}
            className="cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => navigate(`/admin/ai-developer/plans/${p.id}`)}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1 min-w-0">
                <CardTitle className="text-sm truncate">{p.plan?.summary || p.prompt?.slice(0, 60)}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {p.mode.replace(/_/g, " ")} · {new Date(p.created_at).toLocaleDateString()}
                  {changeCount > 0 && ` · ${changeCount} file${changeCount !== 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {p.status === "draft" && (
                  <>
                    <Button onClick={(e) => handleApprove(e, p.id)} disabled={loading} size="sm" variant="outline">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button onClick={(e) => handleReject(e, p.id)} disabled={loading} variant="destructive" size="sm">
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Badge variant={STATUS_VARIANT[p.status] as any || "secondary"}>{p.status.replace(/_/g, " ")}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
