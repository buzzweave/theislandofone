import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Verify admin access via token or Supabase session
  const adminToken = req.headers.get("x-admin-token");
  const authHeader = req.headers.get("Authorization");
  const envAdminToken = Deno.env.get("AI_DEV_ADMIN_TOKEN");

  let isAdmin = false;

  if (adminToken && envAdminToken && adminToken === envAdminToken) {
    isAdmin = true;
  } else if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    if (userData?.user) {
      const { data: role } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (role) isAdmin = true;
    }
  }

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  try {
    const { action, ...params } = await req.json();

    if (action === "list") {
      const { data, error } = await supabaseClient
        .from("access_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create") {
      const { data, error } = await supabaseClient.from("access_codes").insert({
        plan_type: params.plan_type || "reader",
        notes: params.notes || "",
        is_single_use: params.is_single_use ?? true,
        access_type: "lifetime",
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { error } = await supabaseClient
        .from("access_codes")
        .delete()
        .eq("id", params.id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
