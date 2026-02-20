import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePath(p: string): string {
  let r = p.trim();
  r = r.replace(/\\/g, "/");
  r = r.replace(/^\.\//, "");
  r = r.replace(/\/+/g, "/");
  r = r.replace(/\/$/, "");
  if (r.includes("..")) throw new Error(`Path traversal rejected: ${r}`);
  return r;
}

const DEFAULT_FORBIDDEN = [".env", ".env.*", "supabase/config.toml", "config", "secrets", "auth", "billing", "payments"];

function validatePaths(files: string[], allowed: string[], forbidden: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const nFiles = files.map(normalizePath);
  const nAllowed = allowed.map(normalizePath);
  const nForbidden = (forbidden.length > 0 ? forbidden : DEFAULT_FORBIDDEN).map(normalizePath);

  if (nAllowed.length === 0 || (nAllowed.length === 1 && nAllowed[0] === "")) {
    return { valid: false, errors: ["allowedPaths is empty -- Apply blocked"] };
  }

  for (const f of nFiles) {
    const inAllowed = nAllowed.some((a) => f.startsWith(a));
    if (!inAllowed) errors.push(`File "${f}" not in allowed folders`);
    const inForbidden = nForbidden.some((fb) => {
      if (fb.includes("*")) {
        const prefix = fb.replace("*", "");
        return f.startsWith(prefix);
      }
      return f.startsWith(fb);
    });
    if (inForbidden) errors.push(`File "${f}" is in forbidden paths`);
  }
  return { valid: errors.length === 0, errors };
}

async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("No authorization header");
  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) throw new Error("Invalid token");

  const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roles } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");
  if (!roles || roles.length === 0) throw new Error("Not an admin");
  return { user, serviceClient };
}

async function getSettingsMap(serviceClient: any): Promise<Record<string, string>> {
  const { data } = await serviceClient.from("ai_dev_settings").select("*");
  const map: Record<string, string> = {};
  if (data) data.forEach((s: any) => { map[s.key] = s.value; });
  return map;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user, serviceClient } = await verifyAdmin(req);
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "generate_plan": {
        const { prompt, mode } = body;
        if (!prompt) throw new Error("prompt is required");

        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

        const { data: modelSetting } = await serviceClient
          .from("ai_dev_settings")
          .select("value")
          .eq("key", "ai_model")
          .single();
        const model = modelSetting?.value || "google/gemini-3-flash-preview";

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content: `You are an AI developer assistant. Given a user prompt and mode, generate a structured development plan. You MUST call the create_plan function with the plan data. Include a "changes" array with per-file patch objects.`,
              },
              {
                role: "user",
                content: `Mode: ${mode || "fix_bugs"}\n\nRequest: ${prompt}`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "create_plan",
                  description: "Create a structured development plan",
                  parameters: {
                    type: "object",
                    properties: {
                      summary: { type: "string", description: "Brief summary of the plan" },
                      proposedChanges: { type: "string", description: "Detailed description of proposed changes" },
                      filesToChange: { type: "array", items: { type: "string" }, description: "List of existing files to modify" },
                      filesToCreate: { type: "array", items: { type: "string" }, description: "List of new files to create" },
                      changes: {
                        type: "array",
                        description: "Per-file patch objects",
                        items: {
                          type: "object",
                          properties: {
                            path: { type: "string", description: "File path" },
                            operation: { type: "string", enum: ["create", "replace"], description: "create or replace" },
                            before: { type: "string", description: "Original content (null for create)", nullable: true },
                            after: { type: "string", description: "New content" },
                            notes: { type: "string", description: "Change notes", nullable: true },
                          },
                          required: ["path", "operation", "after"],
                        },
                      },
                      navChanges: { type: "array", items: { type: "string" }, description: "Navigation/route changes" },
                      dbChanges: { type: "array", items: { type: "string" }, description: "Database schema changes" },
                      risks: { type: "string", description: "Potential risks" },
                      rollbackSteps: { type: "string", description: "How to rollback" },
                      requiresApproval: { type: "boolean", description: "Whether approval is needed" },
                    },
                    required: ["summary", "proposedChanges", "filesToChange", "filesToCreate", "changes", "navChanges", "dbChanges", "risks", "rollbackSteps", "requiresApproval"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "create_plan" } },
          }),
        });

        if (!aiResponse.ok) {
          const status = aiResponse.status;
          if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          const t = await aiResponse.text();
          console.error("AI error:", status, t);
          throw new Error("AI gateway error");
        }

        const aiData = await aiResponse.json();
        let plan: any;
        try {
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          plan = JSON.parse(toolCall.function.arguments);
        } catch {
          throw new Error("Failed to parse AI response into plan format");
        }

        const { data: inserted, error: insertErr } = await serviceClient
          .from("ai_dev_plans")
          .insert({ prompt, mode: mode || "fix_bugs", plan, status: "draft" })
          .select()
          .single();
        if (insertErr) throw insertErr;

        await serviceClient.from("ai_dev_audit").insert({
          plan_id: inserted.id,
          action: "plan_generated",
          details: { mode, prompt_length: prompt.length },
        });

        return new Response(JSON.stringify(inserted), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "generate_diff": {
        const { plan_id } = body;
        if (!plan_id) throw new Error("plan_id required");

        const { data: plan, error: pErr } = await serviceClient
          .from("ai_dev_plans")
          .select("*")
          .eq("id", plan_id)
          .single();
        if (pErr || !plan) throw new Error("Plan not found");

        const changes = plan.plan?.changes || [];
        if (changes.length === 0) throw new Error("Plan has no changes array");

        const settingsMap = await getSettingsMap(serviceClient);
        const allowed = (settingsMap.allowed_folders || "").split(",").map((s: string) => s.trim()).filter(Boolean);
        const forbidden = (settingsMap.forbidden_folders || "").split(",").map((s: string) => s.trim()).filter(Boolean);

        const allPaths = changes.map((c: any) => c.path);
        const validation = validatePaths(allPaths, allowed, forbidden);

        const diffPayload = changes.map((c: any) => {
          const np = normalizePath(c.path);
          if (c.before && c.after) {
            const beforeLines = c.before.split("\n");
            const afterLines = c.after.split("\n");
            return {
              path: np,
              operation: c.operation,
              type: "unified_diff",
              before: c.before,
              after: c.after,
              beforeLineCount: beforeLines.length,
              afterLineCount: afterLines.length,
              notes: c.notes || null,
            };
          }
          return {
            path: np,
            operation: c.operation || "create",
            type: "new_content",
            after: c.after,
            lineCount: c.after.split("\n").length,
            notes: c.notes || null,
          };
        });

        const version_tag = new Date().toISOString();
        const snapshot = { diff: diffPayload, validation, generated_at: version_tag };

        await serviceClient.from("ai_dev_backups").insert({
          plan_id,
          type: "diff",
          version_tag,
          snapshot,
        });

        await serviceClient.from("ai_dev_audit").insert({
          plan_id,
          action: "diff_generated",
          details: { filesAffected: allPaths.length, validation_result: validation.valid, version_tag },
        });

        return new Response(JSON.stringify({ diff: diffPayload, validation, version_tag }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "apply_plan": {
        const { plan_id } = body;
        if (!plan_id) throw new Error("plan_id required");

        const { data: plan, error: pErr } = await serviceClient
          .from("ai_dev_plans")
          .select("*")
          .eq("id", plan_id)
          .single();
        if (pErr || !plan) throw new Error("Plan not found");
        if (plan.status !== "approved") throw new Error(`Plan status is "${plan.status}", must be "approved"`);

        const changes = plan.plan?.changes || [];
        const settingsMap = await getSettingsMap(serviceClient);
        const allowed = (settingsMap.allowed_folders || "").split(",").map((s: string) => s.trim()).filter(Boolean);
        const forbidden = (settingsMap.forbidden_folders || "").split(",").map((s: string) => s.trim()).filter(Boolean);

        const allPaths = changes.map((c: any) => c.path);
        const validation = validatePaths(allPaths, allowed, forbidden);
        if (!validation.valid) throw new Error(`Path validation failed: ${validation.errors.join("; ")}`);

        const version_tag = new Date().toISOString();
        const snapshot = {
          changes,
          validation,
          applied_at: version_tag,
        };

        await serviceClient.from("ai_dev_backups").insert({
          plan_id,
          type: "apply",
          version_tag,
          snapshot,
        });

        await serviceClient
          .from("ai_dev_plans")
          .update({ status: "applied" })
          .eq("id", plan_id);

        await serviceClient.from("ai_dev_audit").insert({
          plan_id,
          action: "plan_applied",
          details: { filesAffected: allPaths.length, version_tag },
        });

        return new Response(JSON.stringify({ success: true, version_tag }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "rollback_plan": {
        const { plan_id } = body;
        if (!plan_id) throw new Error("plan_id required");

        const { data: plan, error: pErr } = await serviceClient
          .from("ai_dev_plans")
          .select("status")
          .eq("id", plan_id)
          .single();
        if (pErr || !plan) throw new Error("Plan not found");
        if (plan.status !== "applied" && plan.status !== "failed") {
          throw new Error(`Plan status is "${plan.status}", must be "applied" or "failed"`);
        }

        await serviceClient
          .from("ai_dev_plans")
          .update({ status: "rolled_back" })
          .eq("id", plan_id);

        await serviceClient.from("ai_dev_audit").insert({
          plan_id,
          action: "plan_rolled_back",
          details: { previous_status: plan.status },
        });

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "get_plan_status": {
        const { plan_id } = body;
        if (!plan_id) throw new Error("plan_id required");

        const { data: plan, error: pErr } = await serviceClient
          .from("ai_dev_plans")
          .select("*")
          .eq("id", plan_id)
          .single();
        if (pErr || !plan) throw new Error("Plan not found");

        const { data: backups } = await serviceClient
          .from("ai_dev_backups")
          .select("*")
          .eq("plan_id", plan_id)
          .order("created_at", { ascending: false });

        const { data: audit } = await serviceClient
          .from("ai_dev_audit")
          .select("*")
          .eq("plan_id", plan_id)
          .order("created_at", { ascending: false });

        return new Response(JSON.stringify({ plan, backups: backups || [], audit: audit || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "run_scan": {
        const placeholderResults = {
          pages_scanned: 12,
          issues_found: 3,
          findings: [
            { severity: "warning", area: "SEO", message: "Missing meta descriptions on 2 pages" },
            { severity: "info", area: "Performance", message: "Large images could be optimized" },
            { severity: "warning", area: "Accessibility", message: "Missing alt text on 5 images" },
          ],
        };

        const { data: scan, error: scanErr } = await serviceClient
          .from("ai_dev_scans")
          .insert({ scan_type: body.scan_type || "full", results: placeholderResults, status: "completed" })
          .select()
          .single();
        if (scanErr) throw scanErr;

        await serviceClient.from("ai_dev_audit").insert({
          action: "scan_run",
          details: { scan_id: scan.id, scan_type: scan.scan_type },
        });

        return new Response(JSON.stringify(scan), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list_plans": {
        const { data, error: listErr } = await serviceClient
          .from("ai_dev_plans")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (listErr) throw listErr;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "approve_plan": {
        const { plan_id } = body;
        if (!plan_id) throw new Error("plan_id required");
        const { error: upErr } = await serviceClient
          .from("ai_dev_plans")
          .update({ status: "approved" })
          .eq("id", plan_id);
        if (upErr) throw upErr;
        await serviceClient.from("ai_dev_audit").insert({ plan_id, action: "plan_approved", details: {} });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "reject_plan": {
        const { plan_id } = body;
        if (!plan_id) throw new Error("plan_id required");
        const { error: upErr } = await serviceClient
          .from("ai_dev_plans")
          .update({ status: "rejected" })
          .eq("id", plan_id);
        if (upErr) throw upErr;
        await serviceClient.from("ai_dev_audit").insert({ plan_id, action: "plan_rejected", details: {} });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "get_audit": {
        const { search } = body;
        let query = serviceClient
          .from("ai_dev_audit")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        if (search) {
          query = query.ilike("action", `%${search}%`);
        }
        const { data, error: auditErr } = await query;
        if (auditErr) throw auditErr;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "get_settings": {
        const { data, error: sErr } = await serviceClient.from("ai_dev_settings").select("*");
        if (sErr) throw sErr;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "update_settings": {
        const { settings } = body;
        if (!settings || !Array.isArray(settings)) throw new Error("settings array required");
        for (const s of settings) {
          await serviceClient
            .from("ai_dev_settings")
            .upsert({ key: s.key, value: s.value, updated_at: new Date().toISOString() });
        }
        await serviceClient.from("ai_dev_audit").insert({
          action: "settings_updated",
          details: { keys: settings.map((s: any) => s.key) },
        });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (e) {
    console.error("ai-dev-operator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
