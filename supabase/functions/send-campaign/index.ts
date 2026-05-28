const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    // Require authenticated admin
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
    if (!token || token === anonKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userResp = await fetch(`${sbUrl}/auth/v1/user`, {
      headers: { apikey: sbKey, Authorization: `Bearer ${token}` },
    });
    if (!userResp.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = await userResp.json();
    const rolesResp = await fetch(
      `${sbUrl}/rest/v1/user_roles?user_id=eq.${user.id}&role=eq.admin&select=role`,
      { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
    );
    const roles = await rolesResp.json();
    if (!Array.isArray(roles) || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Admin required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { campaignId } = await req.json();
    if (!campaignId) {
      return new Response(JSON.stringify({ error: "Missing campaignId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch campaign
    const campRes = await fetch(
      `${sbUrl}/rest/v1/email_campaigns?id=eq.${encodeURIComponent(campaignId)}&select=*&limit=1`,
      { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
    );
    const campaigns = await campRes.json();
    const campaign = campaigns?.[0];
    if (!campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch active subscribers
    const subRes = await fetch(
      `${sbUrl}/rest/v1/subscribers?is_active=eq.true&select=email,name`,
      { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
    );
    const subscribers = await subRes.json();

    if (!subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ error: "No active subscribers" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch sender settings
    const settingsRes = await fetch(
      `${sbUrl}/rest/v1/smtp_settings?select=from_email,from_name&limit=1`,
      { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
    );
    const settings = await settingsRes.json();
    const fromEmail = settings?.[0]?.from_email || "noreply@theislandofone.com";
    const fromName = settings?.[0]?.from_name || "The Island of One";

    let sentCount = 0;

    if (resendKey) {
      // Send via Resend
      for (const sub of subscribers) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `${fromName} <${fromEmail}>`,
              to: [sub.email],
              subject: campaign.subject,
              html: campaign.content,
            }),
          });
          sentCount++;
        } catch (err) {
          console.error(`Failed to send to ${sub.email}:`, err);
        }
      }
    } else {
      sentCount = subscribers.length;
      console.log(`[DRY RUN] Would send "${campaign.subject}" to ${sentCount} subscribers`);
    }

    // Update campaign status
    await fetch(`${sbUrl}/rest/v1/email_campaigns?id=eq.${encodeURIComponent(campaignId)}`, {
      method: "PATCH",
      headers: {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_count: sentCount,
      }),
    });

    return new Response(JSON.stringify({ success: true, sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-campaign error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
