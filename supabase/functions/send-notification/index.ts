import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple in-memory rate limit (per cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3;
const RATE_WINDOW = 5 * 60 * 1000; // 5 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function validateContact(data: any) {
  if (!data.name || typeof data.name !== "string" || data.name.length > 100) throw new Error("Invalid name");
  if (!data.email || typeof data.email !== "string" || data.email.length > 255) throw new Error("Invalid email");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error("Invalid email format");
  if (data.phone && (typeof data.phone !== "string" || data.phone.length > 30)) throw new Error("Invalid phone");
  if (!data.message || typeof data.message !== "string" || data.message.length > 2000) throw new Error("Invalid message");
  if (data.page_url && (typeof data.page_url !== "string" || data.page_url.length > 500)) throw new Error("Invalid page_url");
}

function validateSpeakerRequest(data: any) {
  if (!data.name || typeof data.name !== "string" || data.name.length > 100) throw new Error("Invalid name");
  if (!data.email || typeof data.email !== "string" || data.email.length > 255) throw new Error("Invalid email");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error("Invalid email format");
  if (!data.event_name || typeof data.event_name !== "string" || data.event_name.length > 200) throw new Error("Invalid event_name");
  if (!data.event_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.event_date)) throw new Error("Invalid event_date");
  if (data.message && (typeof data.message !== "string" || data.message.length > 2000)) throw new Error("Invalid message");
}

// Send email via Resend REST API
async function sendResendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  fromName: string,
  fromEmail: string,
  replyTo: string
) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      reply_to: replyTo || undefined,
      subject,
      html: htmlBody,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Resend API error [${response.status}]: ${JSON.stringify(result)}`);
  }
  return result;
}

function formatContactEmail(data: any): string {
  return `
    <h2>New Contact Form Submission</h2>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Name</td><td style="padding:8px;border:1px solid #ddd">${data.name}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd">${data.email}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Phone</td><td style="padding:8px;border:1px solid #ddd">${data.phone || "N/A"}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Message</td><td style="padding:8px;border:1px solid #ddd">${data.message}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Page URL</td><td style="padding:8px;border:1px solid #ddd">${data.page_url || "N/A"}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Timestamp</td><td style="padding:8px;border:1px solid #ddd">${new Date().toISOString()}</td></tr>
    </table>
  `;
}

function formatSpeakerEmail(data: any): string {
  return `
    <h2>New Speaker Request</h2>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Name</td><td style="padding:8px;border:1px solid #ddd">${data.name}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Organization</td><td style="padding:8px;border:1px solid #ddd">${data.organization || "N/A"}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd">${data.email}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Phone</td><td style="padding:8px;border:1px solid #ddd">${data.phone || "N/A"}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Event</td><td style="padding:8px;border:1px solid #ddd">${data.event_name}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Event Date</td><td style="padding:8px;border:1px solid #ddd">${data.event_date}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Location</td><td style="padding:8px;border:1px solid #ddd">${data.event_location || "N/A"}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Message</td><td style="padding:8px;border:1px solid #ddd">${data.message || "N/A"}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Timestamp</td><td style="padding:8px;border:1px solid #ddd">${new Date().toISOString()}</td></tr>
    </table>
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: "Too many requests. Try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, data, action } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Admin actions require authenticated admin
    if (action === "save_smtp" || action === "test_smtp") {
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
      const { data: adminRoles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
      if (!adminRoles?.length) {
        return new Response(JSON.stringify({ error: "Admin required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle email settings save (admin action)
    if (action === "save_smtp") {
      const { data: existing } = await supabase.from("smtp_settings").select("id").limit(1).single();

      const emailData: any = {
        from_name: data.from_name,
        from_email: data.from_email,
        reply_to: data.reply_to,
      };

      if (existing) {
        await supabase.from("smtp_settings").update(emailData).eq("id", existing.id);
      } else {
        await supabase.from("smtp_settings").insert(emailData);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle email test via Resend
    if (action === "test_smtp") {
      const { data: emailSettings } = await supabase.from("smtp_settings").select("*").limit(1).single();

    const fromName = emailSettings?.from_name || "The Island of One";
    const fromEmail = emailSettings?.from_email || "noreply@theislandofone.com";
    const replyTo = emailSettings?.reply_to || "support@buzzweave.com";
    const testTo = data?.to || "support@buzzweave.com";

      try {
        await sendResendEmail(
          testTo,
          "Email Test - The Island of One",
          "<h2>Email Test Successful</h2><p>Your Resend email integration is working correctly.</p>",
          fromName,
          fromEmail,
          replyTo
        );

        if (emailSettings?.id) {
          await supabase.from("smtp_settings").update({ is_verified: true }).eq("id", emailSettings.id);
        }

        await supabase.from("notifications").insert({
          type: "smtp_test",
          title: "Email Test Successful",
          preview: "Resend email integration is working correctly.",
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        if (emailSettings?.id) {
          await supabase.from("smtp_settings").update({ is_verified: false }).eq("id", emailSettings.id);
        }

        await supabase.from("notifications").insert({
          type: "smtp_test",
          title: "Email Test Failed",
          preview: e.message?.slice(0, 100) || "Unknown error",
        });

        return new Response(JSON.stringify({ error: "Email test failed: " + e.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Honeypot check
    if (data.website) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let notificationTitle = "";
    let notificationPreview = "";
    let emailSubject = "";
    let emailBody = "";
    let replyTo = data.email || "";

    if (type === "contact") {
      validateContact(data);

      const { error } = await supabase.from("contact_submissions").insert({
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone?.trim() || "",
        message: data.message.trim(),
        page_url: data.page_url?.trim() || "",
      });
      if (error) throw new Error("Failed to save submission: " + error.message);

      notificationTitle = "New Contact Submission";
      notificationPreview = `${data.name} — ${data.message.slice(0, 80)}`;
      emailSubject = "New Contact Form Submission";
      emailBody = formatContactEmail(data);

    } else if (type === "speaker_request") {
      validateSpeakerRequest(data);

      const { error } = await supabase.from("speaking_requests").insert({
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone?.trim() || "",
        organization: data.organization?.trim() || null,
        event_name: data.event_name.trim(),
        event_date: data.event_date,
        event_location: data.event_location?.trim() || null,
        message: data.message?.trim() || null,
      });
      if (error) throw new Error("Failed to save request: " + error.message);

      notificationTitle = "New Speaker Request";
      notificationPreview = `${data.name} — ${data.event_name} on ${data.event_date}`;
      emailSubject = "New Speaker Request";
      emailBody = formatSpeakerEmail(data);

    } else {
      return new Response(JSON.stringify({ error: "Invalid type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send email via Resend
    let emailQueued = false;
    const { data: emailSettings } = await supabase.from("smtp_settings").select("*").limit(1).single();

    const fromName = emailSettings?.from_name || "The Island of One";
    const fromEmail = emailSettings?.from_email || "noreply@theislandofone.com";

    try {
      await sendResendEmail("support@buzzweave.com", emailSubject, emailBody, fromName, fromEmail, replyTo);
    } catch {
      emailQueued = true;
    }

    // Create in-app notification
    await supabase.from("notifications").insert({
      type,
      title: notificationTitle,
      preview: notificationPreview,
      data: data,
      email_queued: emailQueued,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
