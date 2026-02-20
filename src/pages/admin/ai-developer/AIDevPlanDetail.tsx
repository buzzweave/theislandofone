import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAIDev } from "@/hooks/useAIDev";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, FileCode, FilePlus, RotateCcw, Play, Diff } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "secondary",
  approved: "default",
  applied: "default",
  failed: "destructive",
  rolled_back: "outline",
  rejected: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  approved: "Approved",
  applied: "Applied",
  failed: "Failed",
  rolled_back: "Rolled Back",
  rejected: "Rejected",
};

export default function AIDevPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPlanStatus, generateDiff, applyPlan, rollbackPlan, loading } = useAIDev();
  const { toast } = useToast();

  const [plan, setPlan] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);

  const load = async () => {
    if (!id) return;
    const data = await getPlanStatus(id);
    if (data) {
      setPlan(data.plan);
      setBackups(data.backups || []);
      setAudit(data.audit || []);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleGenerateDiff = async () => {
    if (!id) return;
    const res = await generateDiff(id);
    if (res) { toast({ title: "Diff generated", description: `Version: ${res.version_tag}` }); load(); }
  };

  const handleApply = async () => {
    if (!id) return;
    const res = await applyPlan(id);
    if (res) { toast({ title: "Plan applied", description: `Version: ${res.version_tag}` }); load(); }
  };

  const handleRollback = async () => {
    if (!id) return;
    const res = await rollbackPlan(id);
    if (res) { toast({ title: "Plan rolled back" }); load(); }
  };

  if (!plan) return <div className="p-6 text-muted-foreground">Loading…</div>;

  const changes = plan.plan?.changes || [];
  const diffBackups = backups.filter((b) => b.type === "diff");
  const latestDiff = diffBackups[0]?.snapshot?.diff || null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/ai-developer/plans")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-display font-bold truncate">{plan.plan?.summary || plan.prompt?.slice(0, 80)}</h2>
          <p className="text-sm text-muted-foreground">
            {plan.mode?.replace(/_/g, " ")} · {new Date(plan.created_at).toLocaleDateString()}
          </p>
        </div>
        <Badge variant={STATUS_COLORS[plan.status] as any || "secondary"}>{STATUS_LABELS[plan.status] || plan.status}</Badge>
      </div>

      {/* Prompt */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Prompt</CardTitle></CardHeader>
        <CardContent><p className="text-sm whitespace-pre-wrap">{plan.prompt}</p></CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleGenerateDiff} disabled={loading} size="sm" variant="outline">
          <Diff className="h-4 w-4 mr-1" /> Generate Diff
        </Button>

        {plan.status === "approved" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" disabled={loading}><Play className="h-4 w-4 mr-1" /> Apply Plan</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apply this plan?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will mark the plan as applied. {changes.length} file(s) affected:
                  <ul className="mt-2 text-xs list-disc pl-4">
                    {changes.slice(0, 10).map((c: any, i: number) => <li key={i}>{c.path} ({c.operation})</li>)}
                    {changes.length > 10 && <li>…and {changes.length - 10} more</li>}
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleApply}>Confirm Apply</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {(plan.status === "applied" || plan.status === "failed") && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" disabled={loading}><RotateCcw className="h-4 w-4 mr-1" /> Rollback</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rollback this plan?</AlertDialogTitle>
                <AlertDialogDescription>This will set the plan status to "rolled_back".</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRollback}>Confirm Rollback</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Diff Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Diff Preview
            {diffBackups.length > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">v{diffBackups[0].version_tag}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!latestDiff && <p className="text-sm text-muted-foreground">No diff generated yet. Click "Generate Diff" above.</p>}
          {latestDiff && (
            <div className="space-y-4">
              {latestDiff.map((d: any, i: number) => (
                <div key={i} className="border rounded-md overflow-hidden">
                  <div className="bg-muted px-3 py-1.5 flex items-center gap-2 text-xs font-mono">
                    {d.operation === "create" ? <FilePlus className="h-3 w-3" /> : <FileCode className="h-3 w-3" />}
                    <span>{d.path}</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">{d.operation}</Badge>
                  </div>
                  {d.type === "unified_diff" ? (
                    <pre className="p-3 text-xs overflow-auto max-h-60 whitespace-pre-wrap bg-background">
                      <span className="text-destructive">- {d.beforeLineCount} lines</span>{"\n"}
                      <span className="text-green-600">+ {d.afterLineCount} lines</span>{"\n\n"}
                      {d.notes && <span className="text-muted-foreground">// {d.notes}</span>}
                    </pre>
                  ) : (
                    <pre className="p-3 text-xs overflow-auto max-h-60 whitespace-pre-wrap bg-background">
                      <span className="text-green-600">+ New file ({d.lineCount} lines)</span>{"\n"}
                      {d.notes && <span className="text-muted-foreground">// {d.notes}{"\n"}</span>}
                      {d.after?.slice(0, 500)}{d.after?.length > 500 ? "\n…" : ""}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan JSON */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Plan JSON (immutable)</CardTitle></CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-80 whitespace-pre-wrap">
            {JSON.stringify(plan.plan, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* Audit Trail */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Audit Trail</CardTitle></CardHeader>
        <CardContent>
          {audit.length === 0 && <p className="text-sm text-muted-foreground">No audit entries.</p>}
          <div className="space-y-2">
            {audit.map((a: any) => (
              <div key={a.id} className="text-xs flex justify-between border-b pb-1">
                <span className="font-mono">{a.action}</span>
                <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
