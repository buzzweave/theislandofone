import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAIDev } from "@/hooks/useAIDev";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function AIDevSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const { getSettings, updateSettings, loading } = useAIDev();
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
            <Textarea value={settings.forbidden_folders || ""} onChange={(e) => update("forbidden_folders", e.target.value)} placeholder="node_modules, .env, auth" rows={3} />
          </div>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
