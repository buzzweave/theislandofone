import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

async function invokeAIDev(action: string, extra: Record<string, any> = {}) {
  const headers: Record<string, string> = {};
  const vpsToken = localStorage.getItem("admin_token");
  if (vpsToken) {
    headers["x-admin-token"] = vpsToken;
  }

  const { data, error } = await supabase.functions.invoke("ai-dev-operator", {
    body: { action, ...extra },
    headers,
  });
  if (error) throw new Error(error.message || "Edge function error");
  return data;
}

export function useAIDev() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const wrap = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    try {
      const result = await fn();
      return result;
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const generatePlan = (prompt: string, mode: string) =>
    wrap(() => invokeAIDev("generate_plan", { prompt, mode }));

  const runScan = (scanType = "full") =>
    wrap(() => invokeAIDev("run_scan", { scan_type: scanType }));

  const listPlans = () => wrap(() => invokeAIDev("list_plans"));

  const approvePlan = (plan_id: string) =>
    wrap(() => invokeAIDev("approve_plan", { plan_id }));

  const rejectPlan = (plan_id: string) =>
    wrap(() => invokeAIDev("reject_plan", { plan_id }));

  const getAudit = (search?: string) =>
    wrap(() => invokeAIDev("get_audit", { search }));

  const getSettings = () => wrap(() => invokeAIDev("get_settings"));

  const updateSettings = (settings: { key: string; value: string }[]) =>
    wrap(() => invokeAIDev("update_settings", { settings }));

  const generateDiff = (plan_id: string) =>
    wrap(() => invokeAIDev("generate_diff", { plan_id }));

  const applyPlan = (plan_id: string) =>
    wrap(() => invokeAIDev("apply_plan", { plan_id }));

  const rollbackPlan = (plan_id: string) =>
    wrap(() => invokeAIDev("rollback_plan", { plan_id }));

  const getPlanStatus = (plan_id: string) =>
    wrap(() => invokeAIDev("get_plan_status", { plan_id }));

  const testDeployAgent = (environment: string) =>
    wrap(() => invokeAIDev("deploy_test", { environment }));

  const previewDeploy = (plan_id: string, environment: string) =>
    wrap(() => invokeAIDev("deploy_preview", { plan_id, environment }));

  const pushDeploy = (plan_id: string, environment: string, confirm: boolean) =>
    wrap(() => invokeAIDev("deploy_push", { plan_id, environment, confirm }));

  const rollbackDeploy = (environment: string, version_tag: string, target_version_tag?: string) =>
    wrap(() => invokeAIDev("deploy_rollback", { environment, version_tag, target_version_tag }));

  const listDeployments = (environment?: string, kind?: string) =>
    wrap(() => invokeAIDev("list_deployments", { environment, kind }));

  return {
    loading,
    generatePlan, runScan, listPlans, approvePlan, rejectPlan,
    getAudit, getSettings, updateSettings,
    generateDiff, applyPlan, rollbackPlan, getPlanStatus,
    testDeployAgent, previewDeploy, pushDeploy, rollbackDeploy, listDeployments,
  };
}
