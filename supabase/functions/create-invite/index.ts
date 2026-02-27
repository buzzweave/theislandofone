import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Admin access required");

    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw new Error("Valid email is required");
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if invite already exists for this email
    const { data: existing } = await supabase
      .from("invitations")
      .select("invite_code, status")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      if (existing.status === "accepted") {
        throw new Error("This person has already accepted their invitation.");
      }
      // Return existing pending invite
      const origin = req.headers.get("origin") || "https://theislandofone.lovable.app";
      return new Response(JSON.stringify({
        invite_code: existing.invite_code,
        invite_url: `${origin}/auth?invite=${existing.invite_code}`,
        share_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/share-invite?code=${existing.invite_code}`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new invite
    const { data: invite, error: insertError } = await supabase
      .from("invitations")
      .insert({ email: normalizedEmail, invited_by: userData.user.id })
      .select("invite_code")
      .single();

    if (insertError) throw new Error(insertError.message);

    const origin = req.headers.get("origin") || "https://theislandofone.lovable.app";

    return new Response(JSON.stringify({
      invite_code: invite.invite_code,
      invite_url: `${origin}/auth?invite=${invite.invite_code}`,
      share_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/share-invite?code=${invite.invite_code}`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
