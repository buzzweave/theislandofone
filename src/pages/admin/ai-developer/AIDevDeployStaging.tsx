import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAIDev } from "@/hooks/useAIDev";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Eye, RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AIDevDeployStaging() {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [latestDeploy, setLatestDeploy] = useState<any>(null);
  const { listPlans, previewDeploy, pushDeploy, rollbackDeploy, listDeployments, loading } = useAIDev();
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const [p, d] = await Promise.all([
        listPlans(),
        listDeployments("staging", "push"),
      ]);
      if (p) setPlans(p.filter((x: any) => x.status === "applied"));
      if (d && d.length > 0) setLatestDeploy(d[0]);
    })();
  }, []);

  const handlePreview = async () => {
    if (!selectedPlan) return;
    const res = await previewDeploy(selectedPlan, "staging");
    if (res) {
      setPreview(res.preview || res);
      toast({ title: "Preview generated" });
    }
  };

  const handlePush = async () => {
    if (!selectedPlan) return;
    const res = await pushDeploy(selectedPlan, "staging", true);
    if (res) {
      toast({ title: "Deployed to staging" });
      setLatestDeploy({ status: res.status, version_tag: res.result?.version_tag || "latest", created_at: new Date().toISOString() });
      setPreview(null);
    }
  };

  const handleRollback = async () => {
    if (!latestDeploy?.version_tag) return;
    const res = await rollbackDeploy("staging", latestDeploy.version_tag);
    if (res) {
      toast({ title: "Staging rolled back" });
      const d = await listDeployments("staging", "push");
      if (d && d.length > 0) setLatestDeploy(d[0]);
    }
  };

  const statusColor = (s: string) => {
    if (s === "success") return "default";
    if (s === "failed") return "destructive";
    if (s === "running") return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold">Staging Deploy</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Applied Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a plan..." />
            </SelectTrigger>
            <SelectContent>
              {plans.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.plan?.summary?.slice(0, 60) || p.prompt.slice(0, 60)} — {p.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button onClick={handlePreview} disabled={!selectedPlan || loading} variant="outline">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
              Generate Preview
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!selectedPlan || loading}>
                  <Upload className="h-4 w-4 mr-2" /> Push to Staging
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deploy to Staging?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will push the selected plan to your staging environment.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePush}>Confirm Deploy</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-64">
              {JSON.stringify(preview, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Latest Staging Deployment</CardTitle>
          {latestDeploy?.status === "success" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={loading}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Rollback
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Rollback Staging?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will rollback the staging environment to the previous version.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRollback}>Confirm Rollback</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardHeader>
        <CardContent>
          {latestDeploy ? (
            <div className="flex items-center gap-4 text-sm">
              <Badge variant={statusColor(latestDeploy.status)}>{latestDeploy.status}</Badge>
              <span className="text-muted-foreground">{latestDeploy.version_tag?.slice(0, 19)}</span>
              <span className="text-muted-foreground text-xs ml-auto">
                {new Date(latestDeploy.created_at).toLocaleString()}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No staging deployments yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
