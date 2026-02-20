import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAIDev } from "@/hooks/useAIDev";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function AIDevSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, "success" | "failed" | null>>({ staging: null, production: null });
  const { getSettings, updateSettings, testDeployAgent, loading } = useAIDev();
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const data = await getSettings();
      if (data) {
        const map: Record<string, string> = {};
        (data as any[]).forEach((s: any) => { map[s.key] = s.value; });
        setSettings(map);
      }
    })();
  }, []);

  const handleSave = async () => {
    const arr = Object.entries(settings).map(([key, value]) => ({ key, value }));
    const res = await updateSettings(arr);
    if (res) toast({ title: "Settings saved" });
  };

  const update = (key: string, value: string) => setSettings((prev) => ({ ...prev, [key]: value }));
  const updateBool = (key: string, checked: boolean) => update(key, checked ? "true" : "false");

  const handleTestConnection = async (env: string) => {
    const res = await testDeployAgent(env);
    setTestResults((prev) => ({ ...prev, [env]: res ? "success" : "failed" }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold">AI Developer Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Model Name</Label>
            <Input value={settings.ai_model || ""} onChange={(e) => update("ai_model", e.target.value)} placeholder="google/gemini-3-flash-preview" />
          </div>
          <div className="space-y-2">
            <Label>Allowed Folders</Label>
            <Textarea value={settings.allowed_folders || ""} onChange={(e) => update("allowed_folders", e.target.value)} placeholder="src/pages, src/components" rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Forbidden Folders</Label>
            <Textarea value={settings.forbidden_folders || ""} onChange={(e) => update("forbidden_folders", e.target.value)} placeholder=".env, .env.*, supabase/config.toml, config, secrets, auth, billing, payments" rows={3} />
          </div>
          {(!settings.allowed_folders || settings.allowed_folders.trim() === "") && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              ⚠️ Apply workflow is blocked until allowed folders are configured.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deployment — Staging Environment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Agent URL</Label>
            <Input value={settings.staging_agent_url || ""} onChange={(e) => update("staging_agent_url", e.target.value)} placeholder="https://staging.example.com" />
          </div>
          <div className="space-y-2">
            <Label>Agent Token</Label>
            <Input type="password" value={settings.staging_agent_token || ""} onChange={(e) => update("staging_agent_token", e.target.value)} placeholder="Bearer token" />
          </div>
          <div className="space-y-2">
            <Label>Base URL (optional)</Label>
            <Input value={settings.staging_base_url || ""} onChange={(e) => update("staging_base_url", e.target.value)} placeholder="https://staging.mysite.com" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleTestConnection("staging")} disabled={loading || !settings.staging_agent_url}>
              Test Connection
            </Button>
            {testResults.staging === "success" && <CheckCircle className="h-4 w-4 text-primary" />}
            {testResults.staging === "failed" && <XCircle className="h-4 w-4 text-destructive" />}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deployment — Live Environment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Agent URL</Label>
            <Input value={settings.production_agent_url || ""} onChange={(e) => update("production_agent_url", e.target.value)} placeholder="https://production.example.com" />
          </div>
          <div className="space-y-2">
            <Label>Agent Token</Label>
            <Input type="password" value={settings.production_agent_token || ""} onChange={(e) => update("production_agent_token", e.target.value)} placeholder="Bearer token" />
          </div>
          <div className="space-y-2">
            <Label>Base URL (optional)</Label>
            <Input value={settings.production_base_url || ""} onChange={(e) => update("production_base_url", e.target.value)} placeholder="https://mysite.com" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleTestConnection("production")} disabled={loading || !settings.production_agent_url}>
              Test Connection
            </Button>
            {testResults.production === "success" && <CheckCircle className="h-4 w-4 text-primary" />}
            {testResults.production === "failed" && <XCircle className="h-4 w-4 text-destructive" />}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shared Deploy Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Preserve Paths</Label>
            <Textarea
              value={settings.preserve_paths || ""}
              onChange={(e) => update("preserve_paths", e.target.value)}
              placeholder=".env, .env.*, uploads, storage, secrets"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Comma or newline separated. These paths will not be overwritten during deployment.</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Require Staging Before Live</Label>
              <p className="text-xs text-muted-foreground">Block production deploy until staging succeeds</p>
            </div>
            <Switch
              checked={settings.require_staging_before_live !== "false"}
              onCheckedChange={(c) => updateBool("require_staging_before_live", c)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Block Deploy When Allowed Folders Empty</Label>
              <p className="text-xs text-muted-foreground">Refuse deploys if no allowed folders configured</p>
            </div>
            <Switch
              checked={settings.block_deploy_when_allowed_folders_empty !== "false"}
              onCheckedChange={(c) => updateBool("block_deploy_when_allowed_folders_empty", c)}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={loading}>
        {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Save Settings"}
      </Button>
    </div>
  );
}
