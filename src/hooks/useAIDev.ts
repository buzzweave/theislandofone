import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

async function invokeAIDev(action: string, extra: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke("ai-dev-operator", {
    body: { action, ...extra },
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

  return {
    loading,
    generatePlan, runScan, listPlans, approvePlan, rejectPlan,
    getAudit, getSettings, updateSettings,
    generateDiff, applyPlan, rollbackPlan, getPlanStatus,
  };
}
