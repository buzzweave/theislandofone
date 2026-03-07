import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Users, CreditCard, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function useStudioSetting(key: string, defaultValue: string) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["site-setting", key],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      return data?.value ?? defaultValue;
    },
  });

  const save = async (value: string) => {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw error;
    queryClient.setQueryData(["site-setting", key], value);
  };

  return { value: data ?? defaultValue, isLoading, save };
}

export default function AdminStudioManager() {
  const landingSetting = useStudioSetting("studio_landing_enabled", "false");
  const [landingEnabled, setLandingEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLandingEnabled(landingSetting.value === "true");
  }, [landingSetting.value]);

  const { data: subCount } = useQuery({
    queryKey: ["studio-sub-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("workspace_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      return count ?? 0;
    },
  });

  const { data: orgCount } = useQuery({
    queryKey: ["studio-org-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("organizations")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const handleToggle = async (checked: boolean) => {
    setLandingEnabled(checked);
    setSaving(true);
    try {
      await landingSetting.save(checked ? "true" : "false");
      toast.success(checked ? "Studio landing page is now live on the homepage" : "Ministry homepage restored");
    } catch {
      toast.error("Failed to save setting");
      setLandingEnabled(!checked);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold mb-1">Writing Studio Manager</h2>
        <p className="text-sm text-muted-foreground">
          Manage the Island of One Writing Studio SaaS platform.
        </p>
      </div>

      {/* Landing Page Toggle */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            Homepage Override
          </CardTitle>
          <CardDescription>
            When enabled, the Studio landing page replaces theislandofone.com homepage. The ministry site pages remain accessible via their direct URLs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="landing-toggle" className="text-sm font-medium">
              Show Studio Landing Page as Homepage
            </Label>
            <div className="flex items-center gap-3">
              {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Switch
                id="landing-toggle"
                checked={landingEnabled}
                onCheckedChange={handleToggle}
                disabled={saving || landingSetting.isLoading}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {landingEnabled
              ? "✅ Studio landing page is currently live on the homepage."
              : "Ministry homepage is currently displayed."}
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{orgCount ?? "—"}</p>
                <p className="text-sm text-muted-foreground">Total Workspaces</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{subCount ?? "—"}</p>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
