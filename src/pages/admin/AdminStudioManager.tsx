import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Users, CreditCard, Globe, DollarSign, Loader2, BookOpen, TrendingUp,
  Building2, CheckCircle2, XCircle, Mail
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
  const PRICE_PER_SUB = 19.95;

  useEffect(() => {
    setLandingEnabled(landingSetting.value === "true");
  }, [landingSetting.value]);

  // Stats queries
  const { data: subCount = 0 } = useQuery({
    queryKey: ["studio-sub-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("workspace_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      return count ?? 0;
    },
  });

  const { data: orgCount = 0 } = useQuery({
    queryKey: ["studio-org-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("organizations")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: totalSubs = 0 } = useQuery({
    queryKey: ["studio-total-subs"],
    queryFn: async () => {
      const { count } = await supabase
        .from("workspace_subscriptions")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  // Super admin: all studios with details
  const { data: allStudios = [] } = useQuery({
    queryKey: ["studio-all-studios"],
    queryFn: async () => {
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name, slug, owner_id, created_at")
        .order("created_at", { ascending: false });
      if (!orgs || orgs.length === 0) return [];

      // Get branding for all orgs
      const orgIds = orgs.map((o: any) => o.id);
      const { data: brandings } = await supabase
        .from("workspace_branding")
        .select("org_id, studio_name, author_name")
        .in("org_id", orgIds);

      // Get subscriptions for all orgs
      const { data: subs } = await supabase
        .from("workspace_subscriptions")
        .select("org_id, status, user_id, created_at")
        .in("org_id", orgIds);

      // Get owner profiles
      const ownerIds = [...new Set(orgs.map((o: any) => o.owner_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", ownerIds);

      const brandingMap = new Map((brandings || []).map((b: any) => [b.org_id, b]));
      const subMap = new Map((subs || []).map((s: any) => [s.org_id, s]));
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      return orgs.map((org: any) => {
        const branding = brandingMap.get(org.id);
        const sub = subMap.get(org.id);
        const profile = profileMap.get(org.owner_id);
        return {
          ...org,
          studio_name: branding?.studio_name || org.name,
          author_name: branding?.author_name || profile?.full_name || "—",
          email: profile?.email || "—",
          sub_status: sub?.status || "none",
          has_branding: !!branding,
        };
      });
    },
  });

  // Recent signups (last 7 days)
  const recentSignups = allStudios.filter((s: any) => {
    const created = new Date(s.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return created >= weekAgo;
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

  const mrr = subCount * PRICE_PER_SUB;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold mb-1">Writing Studio Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          SaaS overview for Island of One Writer Studio
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{orgCount}</p>
                <p className="text-sm text-muted-foreground">Total Studios</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{subCount}</p>
                <p className="text-sm text-muted-foreground">Active Subscribers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">${mrr.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{recentSignups.length}</p>
                <p className="text-sm text-muted-foreground">New This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Landing Page Toggle */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            Homepage Override
          </CardTitle>
          <CardDescription>
            When enabled, the Studio landing page replaces theislandofone.com homepage.
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

      {/* All Studios (Super Admin) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            All Writer Studios
          </CardTitle>
          <CardDescription>
            All SaaS studio signups across the platform ({allStudios.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allStudios.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No studios yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Studio</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Branding</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allStudios.map((studio: any) => (
                    <TableRow key={studio.id}>
                      <TableCell className="font-medium">{studio.studio_name}</TableCell>
                      <TableCell>{studio.author_name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{studio.email}</TableCell>
                      <TableCell>
                        <Badge variant={studio.sub_status === "active" ? "default" : "secondary"} className="text-xs">
                          {studio.sub_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {studio.has_branding ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(studio.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}