import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

  try {
    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    const user = userData.user;
    if (!user) throw new Error("Not authenticated");

    const { code } = await req.json();
    if (!code) throw new Error("Access code is required");

    // Look up the code
    const { data: accessCode, error: codeError } = await supabaseClient
      .from("access_codes")
      .select("*")
      .eq("code", code.trim())
      .maybeSingle();

    if (codeError) throw codeError;
    if (!accessCode) {
      return new Response(JSON.stringify({ error: "Invalid access code." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if already redeemed (single-use)
    if (accessCode.is_single_use && accessCode.redeemed_by_user_id) {
      return new Response(JSON.stringify({ error: "This code has already been redeemed." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Redeem the code
    await supabaseClient
      .from("access_codes")
      .update({
        redeemed_by_user_id: user.id,
        redeemed_at: new Date().toISOString(),
      })
      .eq("id", accessCode.id);

    // Also add/update the members table for compatibility
    const { data: existingMember } = await supabaseClient
      .from("members")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    const planName = accessCode.plan_type === "pastor" ? "Pastor" :
                     accessCode.plan_type === "inner-circle" ? "Inner Circle" :
                     accessCode.plan_type === "full" ? "Inner Circle" : "Reader";

    if (existingMember) {
      await supabaseClient
        .from("members")
        .update({ plan: planName, status: "active", user_id: user.id })
        .eq("id", existingMember.id);
    } else {
      await supabaseClient.from("members").insert({
        email: user.email!,
        name: user.user_metadata?.full_name || user.email!,
        plan: planName,
        status: "active",
        user_id: user.id,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      plan_type: accessCode.plan_type,
      access_type: accessCode.access_type,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
