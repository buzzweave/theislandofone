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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    const { invite_code } = await req.json();
    if (!invite_code) throw new Error("Invite code required");

    const userEmail = userData.user.email?.toLowerCase().trim();
    if (!userEmail) throw new Error("User email not available");

    // Find the invite
    const { data: invite, error: findError } = await supabase
      .from("invitations")
      .select("*")
      .eq("invite_code", invite_code)
      .eq("status", "pending")
      .maybeSingle();

    if (findError || !invite) {
      throw new Error("Invalid or expired invitation.");
    }

    // Check email matches
    if (invite.email.toLowerCase() !== userEmail) {
      throw new Error("This invitation was sent to a different email address. Please sign up with the email the invitation was sent to.");
    }

    // Mark invite as accepted
    await supabase
      .from("invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    // Grant Inner Circle membership
    const { data: existingMember } = await supabase
      .from("members")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();

    if (existingMember) {
      await supabase
        .from("members")
        .update({ plan: "Inner Circle", status: "active", user_id: userData.user.id })
        .eq("id", existingMember.id);
    } else {
      await supabase
        .from("members")
        .insert({
          email: userEmail,
          name: userData.user.user_metadata?.full_name || userEmail.split("@")[0],
          plan: "Inner Circle",
          status: "active",
          user_id: userData.user.id,
        });
    }

    return new Response(JSON.stringify({ success: true, plan: "Inner Circle" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
