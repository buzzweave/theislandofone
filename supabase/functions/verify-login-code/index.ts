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
    const { email, code } = await req.json();
    if (!email || !code) throw new Error("Email and code are required");

    const normalizedEmail = email.trim().toLowerCase();

    // Look up the code
    const { data: loginCode } = await supabaseClient
      .from("login_codes")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("code", code.trim())
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!loginCode) {
      return new Response(JSON.stringify({
        error: "invalid_code",
        message: "Invalid or expired code. Please try again.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Mark code as used
    await supabaseClient
      .from("login_codes")
      .update({ used: true })
      .eq("id", loginCode.id);

    // Check if user exists in auth
    const { data: users } = await supabaseClient.auth.admin.listUsers();
    const existingUser = users?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (!existingUser) {
      return new Response(JSON.stringify({
        error: "no_account",
        message: "No account found for this email. Please create an account first.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Generate a magic link for the user (we return the token for frontend verification)
    const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
    });

    if (linkError) throw linkError;

    // Extract the token_hash from the action_link
    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) throw new Error("Failed to generate session link");

    // Parse out token_hash from the URL
    const url = new URL(actionLink);
    const tokenHash = url.searchParams.get("token_hash") || url.hash?.match(/token_hash=([^&]+)/)?.[1];

    if (!tokenHash) {
      // Fallback: return the full action link for client-side verification
      return new Response(JSON.stringify({
        success: true,
        action_link: actionLink,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      token_hash: tokenHash,
      email: normalizedEmail,
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
