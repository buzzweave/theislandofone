import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_TO_PRODUCT: Record<string, string> = {
  "Reader": "prod_U0P10UqgQoHMC1",
  "Pastor": "prod_U0P1BekfHAyBdT",
  "Inner Circle": "prod_U0P1B7ICDjNhyK",
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
    const { email } = await req.json();
    if (!email) throw new Error("Email is required");

    const normalizedEmail = email.trim().toLowerCase();

    // --- Check if user has valid access ---
    let hasAccess = false;
    let planType: string | null = null;

    // 1. Check Stripe subscription
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      const customers = await stripe.customers.list({ email: normalizedEmail, limit: 1 });
      if (customers.data.length > 0) {
        const subs = await stripe.subscriptions.list({
          customer: customers.data[0].id,
          status: "active",
          limit: 1,
        });
        if (subs.data.length > 0) {
          hasAccess = true;
          const productId = subs.data[0].items.data[0].price.product as string;
          for (const [name, pid] of Object.entries(PLAN_TO_PRODUCT)) {
            if (pid === productId) { planType = name; break; }
          }
        }
      }
    }

    // 2. Check members table
    if (!hasAccess) {
      const { data: member } = await supabaseClient
        .from("members")
        .select("plan, status")
        .eq("email", normalizedEmail)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (member && member.plan !== "Free") {
        hasAccess = true;
        planType = member.plan;
      }
    }

    // 3. Check redeemed access codes
    if (!hasAccess) {
      // Find user by email
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("id")
        .eq("email", normalizedEmail)
        .limit(1)
        .maybeSingle();

      if (profile) {
        const { data: codes } = await supabaseClient
          .from("access_codes")
          .select("plan_type")
          .eq("redeemed_by_user_id", profile.id)
          .limit(1)
          .maybeSingle();

        if (codes) {
          hasAccess = true;
          planType = codes.plan_type;
        }
      }
    }

    // 4. Check if there are any unredeemed access codes available
    // (user might have a code but hasn't entered it yet — let them through
    //  so they can enter the code on the next screen)
    if (!hasAccess) {
      // We allow sending a login code even without access,
      // because the user might have a lifetime code to enter.
      // The verify step will handle access validation.
      hasAccess = true;
      planType = "pending";
    }

    if (!hasAccess) {
      return new Response(JSON.stringify({
        error: "no_access",
        message: "No active subscription or access found for this email.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // --- Generate 6-digit code ---
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Invalidate old codes for this email
    await supabaseClient
      .from("login_codes")
      .update({ used: true })
      .eq("email", normalizedEmail)
      .eq("used", false);

    // Insert new code
    await supabaseClient.from("login_codes").insert({
      email: normalizedEmail,
      code,
      expires_at: expiresAt,
    });

    // --- Send email via Resend ---
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("RESEND_API_KEY is not set");
      return new Response(JSON.stringify({
        error: "email_not_configured",
        message: "Email service is not configured. Please contact support.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "The Island of One <noreply@theislandofone.com>",
        reply_to: "support@buzzweave.com",
        to: [normalizedEmail],
        subject: "Your Island of One login code",
        html: `
          <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #1a1a1a; margin-bottom: 24px;">Your Login Code</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Enter this code in the app to sign in:
            </p>
            <div style="background: #f5f0e8; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="font-size: 36px; letter-spacing: 8px; font-weight: bold; color: #1a1a1a; font-family: monospace;">
                ${code}
              </span>
            </div>
            <p style="color: #888; font-size: 14px;">
              This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
            <p style="color: #aaa; font-size: 12px;">The Island of One Ministries</p>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend send failed", resendRes.status, errBody);
      return new Response(JSON.stringify({
        error: "email_send_failed",
        message: "Could not send login email. Please try again or contact support.",
        details: errBody,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
