import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

        // Get model from settings
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
                content: `You are an AI developer assistant. Given a user prompt and mode, generate a structured development plan. You MUST call the create_plan function with the plan data.`,
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
                      navChanges: { type: "array", items: { type: "string" }, description: "Navigation/route changes" },
                      dbChanges: { type: "array", items: { type: "string" }, description: "Database schema changes" },
                      risks: { type: "string", description: "Potential risks" },
                      rollbackSteps: { type: "string", description: "How to rollback" },
                      requiresApproval: { type: "boolean", description: "Whether approval is needed" },
                    },
                    required: ["summary", "proposedChanges", "filesToChange", "filesToCreate", "navChanges", "dbChanges", "risks", "rollbackSteps", "requiresApproval"],
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
