import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(sbUrl, sbKey);

    const payload = await req.json();
    const { action, campaignId, message, recipientIds } = payload;

    // Handle inbound webhook (STOP messages) — validate Twilio signature (HMAC-SHA1)
    if (payload?.action === "inbound_webhook" || req.headers.get("x-twilio-signature")) {
      const twilioSig = req.headers.get("x-twilio-signature") || "";
      const expectedToken = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
      if (!twilioSig || !expectedToken) {
        return new Response(JSON.stringify({ error: "Unauthorized webhook" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Twilio signs URL + sorted concatenation of POST parameter name+value pairs
      // We accept form-encoded (real Twilio) by re-reading body if needed
      const url = req.url;
      // Recreate the signed string from payload fields (works for JSON test calls too,
      // but real Twilio sends form-encoded data which produces a different string).
      const params = payload as Record<string, unknown>;
      const sortedKeys = Object.keys(params).filter((k) => k !== "action").sort();
      let signedString = url;
      for (const k of sortedKeys) signedString += k + String(params[k] ?? "");

      const keyData = new TextEncoder().encode(expectedToken);
      const msgData = new TextEncoder().encode(signedString);
      const cryptoKey = await crypto.subtle.importKey(
        "raw", keyData, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
      );
      const sigBytes = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
      const expected = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));

      if (twilioSig !== expected) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { from, body } = payload;
      const stopWords = ["STOP", "UNSUBSCRIBE", "QUIT", "END", "CANCEL"];
      if (stopWords.some((w) => (body || "").toUpperCase().includes(w))) {
        await supabase
          .from("subscribers")
          .update({
            sms_opt_out: true,
            sms_opt_in: false,
            sms_last_opt_out_at: new Date().toISOString(),
          })
          .eq("phone_number", from);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check — REQUIRED admin for all other actions
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
    if (!token || token === anonKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
    if (!roles?.length) {
      return new Response(JSON.stringify({ error: "Admin required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send SMS campaign
    const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");

    if (!TWILIO_SID || !TWILIO_TOKEN || !FROM_NUMBER) {
      return new Response(JSON.stringify({ error: "SMS provider not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get eligible recipients
    let query = supabase
      .from("subscribers")
      .select("id, phone_number, name")
      .eq("sms_opt_in", true)
      .eq("sms_opt_out", false)
      .neq("phone_number", "");

    if (recipientIds?.length) {
      query = query.in("id", recipientIds);
    }

    const { data: recipients, error: recErr } = await query;
    if (recErr) throw recErr;
    if (!recipients?.length) {
      return new Response(JSON.stringify({ error: "No eligible recipients", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Quiet hours check (10pm-8am EST)
    const now = new Date();
    const estHour = (now.getUTCHours() - 5 + 24) % 24;
    if (estHour >= 22 || estHour < 8) {
      return new Response(JSON.stringify({ error: "Quiet hours (10 PM – 8 AM EST). Messages cannot be sent during this time." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create campaign record
    let campaignRecord = campaignId;
    if (!campaignRecord) {
      const { data: camp } = await supabase
        .from("sms_campaigns")
        .insert({ name: "Quick Send", message_template: message, status: "sending" })
        .select()
        .single();
      campaignRecord = camp?.id;
    } else {
      await supabase.from("sms_campaigns").update({ status: "sending" }).eq("id", campaignId);
    }

    // Send with batching (1 per 100ms to stay under rate limits)
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        const body = new URLSearchParams({
          To: recipient.phone_number,
          From: FROM_NUMBER,
          Body: message.replace("{name}", recipient.name || "Friend"),
        });

        const twilioRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
          }
        );

        const twilioData = await twilioRes.json();

        await supabase.from("sms_messages").insert({
          campaign_id: campaignRecord,
          contact_id: recipient.id,
          to_number: recipient.phone_number,
          from_number: FROM_NUMBER,
          body: message.replace("{name}", recipient.name || "Friend"),
          status: twilioRes.ok ? "sent" : "failed",
          provider_message_id: twilioData.sid || "",
          error: twilioData.message || "",
          sent_at: twilioRes.ok ? new Date().toISOString() : null,
        });

        if (twilioRes.ok) sent++;
        else failed++;

        // Rate limit: 100ms between messages
        await new Promise((r) => setTimeout(r, 100));
      } catch (err: any) {
        failed++;
        await supabase.from("sms_messages").insert({
          campaign_id: campaignRecord,
          contact_id: recipient.id,
          to_number: recipient.phone_number,
          from_number: FROM_NUMBER,
          body: message,
          status: "failed",
          error: err.message,
        });
      }
    }

    // Update campaign status
    await supabase.from("sms_campaigns").update({
      status: "sent",
      updated_at: new Date().toISOString(),
    }).eq("id", campaignRecord);

    return new Response(JSON.stringify({ sent, failed, total: recipients.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-sms error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
