import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAIDev } from "@/hooks/useAIDev";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X } from "lucide-react";

const modes = [
  { value: "fix_bugs", label: "Fix bugs" },
  { value: "build_feature", label: "Build feature" },
  { value: "refactor", label: "Refactor" },
  { value: "content_publish", label: "Content publish" },
];

export default function AIDevConsole() {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState("fix_bugs");
  const [result, setResult] = useState<any>(null);
  const { generatePlan, approvePlan, rejectPlan, loading } = useAIDev();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    const data = await generatePlan(prompt, mode);
    if (data) setResult(data);
  };

  const handleApprove = async () => {
    if (!result?.id) return;
    const res = await approvePlan(result.id);
    if (res) {
      setResult({ ...result, status: "approved" });
      toast({ title: "Plan approved" });
    }
  };

  const handleReject = async () => {
    if (!result?.id) return;
    const res = await rejectPlan(result.id);
    if (res) {
      setResult({ ...result, status: "rejected" });
      toast({ title: "Plan rejected" });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold">AI Console</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Describe what you want to fix, build, or improve..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modes.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</> : "Generate Plan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Plan Output</CardTitle>
            <Badge variant={result.status === "approved" ? "default" : result.status === "rejected" ? "destructive" : "secondary"}>
              {result.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-96 whitespace-pre-wrap">
              {JSON.stringify(result.plan, null, 2)}
            </pre>
            {result.status === "draft" && (
              <div className="flex gap-2">
                <Button onClick={handleApprove} disabled={loading} variant="default" size="sm">
                  <Check className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button onClick={handleReject} disabled={loading} variant="destructive" size="sm">
                  <X className="h-4 w-4 mr-1" /> Reject
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
