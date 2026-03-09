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
    const trimmedCode = code.trim();

    // --- 1. Check login_codes table first (email-sent codes) ---
    const { data: loginCode } = await supabaseClient
      .from("login_codes")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("code", trimmedCode)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (loginCode) {
      // Mark code as used
      await supabaseClient
        .from("login_codes")
        .update({ used: true })
        .eq("id", loginCode.id);

      // Generate magic link for the user
      return await generateSessionForEmail(supabaseClient, normalizedEmail);
    }

    // --- 2. Check access_codes table (lifetime codes) ---
    const { data: accessCode } = await supabaseClient
      .from("access_codes")
      .select("*")
      .eq("code", trimmedCode)
      .is("redeemed_by_user_id", null)
      .limit(1)
      .maybeSingle();

    if (accessCode) {
      // Found an unredeemed lifetime code — redeem it for this user
      // First ensure user exists in auth
      let userId: string | null = null;

      const { data: users } = await supabaseClient.auth.admin.listUsers();
      const existingUser = users?.users?.find(
        (u) => u.email?.toLowerCase() === normalizedEmail
      );

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create account for this email
        const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
          email: normalizedEmail,
          email_confirm: true,
        });
        if (createError) throw createError;
        userId = newUser.user.id;
      }

      // Redeem the access code
      if (accessCode.is_single_use || !accessCode.redeemed_by_user_id) {
        await supabaseClient
          .from("access_codes")
          .update({
            redeemed_by_user_id: userId,
            redeemed_at: new Date().toISOString(),
          })
          .eq("id", accessCode.id);
      }

      // Ensure member record exists
      const planName = accessCode.plan_type === "pastor" ? "Pastor" :
                       accessCode.plan_type === "inner-circle" ? "Inner Circle" :
                       accessCode.plan_type === "full" ? "Inner Circle" : "Reader";

      const { data: existingMember } = await supabaseClient
        .from("members")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (existingMember) {
        await supabaseClient
          .from("members")
          .update({ plan: planName, status: "active", user_id: userId })
          .eq("id", existingMember.id);
      } else {
        await supabaseClient
          .from("members")
          .insert({
            email: normalizedEmail,
            name: normalizedEmail.split("@")[0],
            plan: planName,
            status: "active",
            user_id: userId,
          });
      }

      // Generate session
      return await generateSessionForEmail(supabaseClient, normalizedEmail);
    }

    // --- 3. Also check already-redeemed access codes for this email ---
    // If user already redeemed a code before, let them log in with it
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profile) {
      const { data: redeemedCode } = await supabaseClient
        .from("access_codes")
        .select("*")
        .eq("code", trimmedCode)
        .eq("redeemed_by_user_id", profile.id)
        .maybeSingle();

      if (redeemedCode) {
        return await generateSessionForEmail(supabaseClient, normalizedEmail);
      }
    }

    // No valid code found
    return new Response(JSON.stringify({
      error: "invalid_code",
      message: "Invalid or expired code. Please try again.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function generateSessionForEmail(supabaseClient: any, email: string) {
  // Check if user exists
  const { data: users } = await supabaseClient.auth.admin.listUsers();
  const existingUser = users?.users?.find(
    (u: any) => u.email?.toLowerCase() === email
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

  // Generate a magic link
  const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError) throw linkError;

  const actionLink = linkData?.properties?.action_link;
  if (!actionLink) throw new Error("Failed to generate session link");

  const url = new URL(actionLink);
  const tokenHash = url.searchParams.get("token_hash") || url.hash?.match(/token_hash=([^&]+)/)?.[1];

  if (!tokenHash) {
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
    email,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
