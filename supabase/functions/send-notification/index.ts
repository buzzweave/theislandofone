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

// AES-256-CBC encrypt/decrypt using Web Crypto API
async function decryptPassword(encrypted: string, key: string): Promise<string> {
  if (!encrypted) return "";
  try {
    const [ivHex, dataHex] = encrypted.split(":");
    const iv = new Uint8Array(ivHex.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)));
    const data = new Uint8Array(dataHex.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)));
    const keyData = new TextEncoder().encode(key.slice(0, 32).padEnd(32, "0"));
    const cryptoKey = await crypto.subtle.importKey("raw", keyData, "AES-CBC", false, ["decrypt"]);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, cryptoKey, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    return "";
  }
}

async function encryptPassword(plaintext: string, key: string): Promise<string> {
  if (!plaintext) return "";
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const keyData = new TextEncoder().encode(key.slice(0, 32).padEnd(32, "0"));
  const cryptoKey = await crypto.subtle.importKey("raw", keyData, "AES-CBC", false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, cryptoKey, new TextEncoder().encode(plaintext));
  const ivHex = Array.from(iv).map((b) => b.toString(16).padStart(2, "0")).join("");
  const dataHex = Array.from(new Uint8Array(encrypted)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${ivHex}:${dataHex}`;
}

// Robust SMTP send via Deno TCP with proper multi-line response handling
async function sendSmtpEmail(smtp: any, password: string, to: string, subject: string, body: string, replyTo: string) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Helper: read a full SMTP response (handles multi-line responses like 250-xxx / 250 xxx)
  async function readFullResponse(conn: Deno.TcpConn | Deno.TlsConn): Promise<string> {
    let accumulated = "";
    const maxAttempts = 30; // 30 * 200ms = 6s max wait
    for (let i = 0; i < maxAttempts; i++) {
      const buf = new Uint8Array(4096);
      try {
        const n = await conn.read(buf);
        if (n === null) break;
        accumulated += decoder.decode(buf.subarray(0, n));
      } catch {
        break;
      }
      // Check if we have a complete response: last line matches "XXX " (3 digits + space)
      const lines = accumulated.trimEnd().split("\r\n");
      const lastLine = lines[lines.length - 1];
      if (/^\d{3} /.test(lastLine) || /^\d{3}$/.test(lastLine)) {
        return accumulated;
      }
      // If last line is a continuation (XXX-), keep reading
    }
    if (!accumulated) throw new Error("SMTP: No response from server");
    return accumulated;
  }

  async function writeCmd(conn: Deno.TcpConn | Deno.TlsConn, cmd: string) {
    await conn.write(encoder.encode(cmd + "\r\n"));
  }

  async function writeAndRead(conn: Deno.TcpConn | Deno.TlsConn, cmd: string): Promise<string> {
    await writeCmd(conn, cmd);
    // Small delay to let server process
    await new Promise((r) => setTimeout(r, 150));
    return await readFullResponse(conn);
  }

  function getCode(response: string): string {
    return response.substring(0, 3);
  }

  let activeConn: Deno.TcpConn | Deno.TlsConn | null = null;

  try {
    // Step 1: Connect
    const plainConn: Deno.TcpConn = smtp.encryption === "ssl"
      ? await Deno.connectTls({ hostname: smtp.host, port: smtp.port }) as unknown as Deno.TcpConn
      : await Deno.connect({ hostname: smtp.host, port: smtp.port });
    activeConn = plainConn;

    // Step 2: Read greeting
    await new Promise((r) => setTimeout(r, 300));
    const greeting = await readFullResponse(plainConn);
    if (!getCode(greeting).startsWith("2")) throw new Error("SMTP greeting failed: " + greeting.trim());

    // Step 3: EHLO
    const ehloResp = await writeAndRead(plainConn, "EHLO localhost");
    if (!getCode(ehloResp).startsWith("2")) throw new Error("SMTP EHLO failed: " + ehloResp.trim());

    // Step 4: STARTTLS if needed
    if (smtp.encryption === "tls") {
      if (!ehloResp.toUpperCase().includes("STARTTLS")) {
        throw new Error("SMTP server does not support STARTTLS. EHLO response: " + ehloResp.trim());
      }

      const starttlsResp = await writeAndRead(plainConn, "STARTTLS");
      if (getCode(starttlsResp) !== "220") {
        throw new Error("SMTP STARTTLS rejected: " + starttlsResp.trim());
      }

      // Step 5: Upgrade to TLS
      const tlsConn = await Deno.startTls(plainConn, { hostname: smtp.host });
      activeConn = tlsConn;

      // Step 6: EHLO again over TLS
      const ehlo2 = await writeAndRead(tlsConn, "EHLO localhost");
      if (!getCode(ehlo2).startsWith("2")) throw new Error("SMTP EHLO (TLS) failed: " + ehlo2.trim());
    }

    // Step 7: AUTH LOGIN
    const authPrompt = await writeAndRead(activeConn, "AUTH LOGIN");
    if (!getCode(authPrompt).startsWith("3")) throw new Error("SMTP AUTH LOGIN rejected: " + authPrompt.trim());

    const userResp = await writeAndRead(activeConn, btoa(smtp.username));
    if (!getCode(userResp).startsWith("3")) throw new Error("SMTP username rejected: " + userResp.trim());

    const passResp = await writeAndRead(activeConn, btoa(password));
    if (!getCode(passResp).startsWith("2")) throw new Error("SMTP auth failed: " + passResp.trim());

    // Step 8: MAIL FROM / RCPT TO / DATA
    const mailResp = await writeAndRead(activeConn, `MAIL FROM:<${smtp.from_email}>`);
    if (!getCode(mailResp).startsWith("2")) throw new Error("SMTP MAIL FROM failed: " + mailResp.trim());

    const rcptResp = await writeAndRead(activeConn, `RCPT TO:<${to}>`);
    if (!getCode(rcptResp).startsWith("2")) throw new Error("SMTP RCPT TO failed: " + rcptResp.trim());

    const dataResp = await writeAndRead(activeConn, "DATA");
    if (!getCode(dataResp).startsWith("3")) throw new Error("SMTP DATA rejected: " + dataResp.trim());

    // Step 9: Send email content
    const emailContent = [
      `From: ${smtp.from_name} <${smtp.from_email}>`,
      `To: ${to}`,
      `Reply-To: ${replyTo}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      `Date: ${new Date().toUTCString()}`,
      ``,
      body,
      ``,
      `.`,
    ].join("\r\n");

    const sendResult = await writeAndRead(activeConn, emailContent);
    if (!getCode(sendResult).startsWith("2")) throw new Error("SMTP send failed: " + sendResult.trim());

    // Step 10: QUIT
    try { await writeCmd(activeConn, "QUIT"); } catch { /* ignore */ }
    try { activeConn.close(); } catch { /* ignore */ }
  } catch (e) {
    try { if (activeConn) activeConn.close(); } catch { /* ignore */ }
    throw e;
  }
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
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Expected Attendance</td><td style="padding:8px;border:1px solid #ddd">${data.expected_attendance || "N/A"}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Budget/Honorarium</td><td style="padding:8px;border:1px solid #ddd">${data.budget || "N/A"}</td></tr>
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

    // Handle SMTP settings save (admin action)
    if (action === "save_smtp") {
      const encrypted = data.password ? await encryptPassword(data.password, serviceRoleKey) : undefined;
      
      const { data: existing } = await supabase.from("smtp_settings").select("id").limit(1).single();
      
      const smtpData: any = {
        host: data.host,
        port: data.port,
        username: data.username,
        encryption: data.encryption,
        from_name: data.from_name,
        from_email: data.from_email,
        reply_to: data.reply_to,
      };
      if (encrypted) smtpData.encrypted_password = encrypted;
      
      if (existing) {
        await supabase.from("smtp_settings").update(smtpData).eq("id", existing.id);
      } else {
        if (encrypted) smtpData.encrypted_password = encrypted;
        await supabase.from("smtp_settings").insert(smtpData);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle SMTP test
    if (action === "test_smtp") {
      const { data: smtp } = await supabase.from("smtp_settings").select("*").limit(1).single();
      if (!smtp || !smtp.host) {
        return new Response(JSON.stringify({ error: "SMTP not configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const password = await decryptPassword(smtp.encrypted_password, serviceRoleKey);
      try {
        await sendSmtpEmail(
          smtp, password,
          data.to || smtp.from_email,
          "SMTP Test - The Island of One",
          "<h2>SMTP Test Successful</h2><p>Your email settings are configured correctly.</p>",
          smtp.reply_to || smtp.from_email
        );

        await supabase.from("smtp_settings").update({ is_verified: true }).eq("id", smtp.id);

        // Create success notification
        await supabase.from("notifications").insert({
          type: "smtp_test",
          title: "SMTP Test Successful",
          preview: "Email configuration is working correctly.",
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        await supabase.from("smtp_settings").update({ is_verified: false }).eq("id", smtp.id);

        await supabase.from("notifications").insert({
          type: "smtp_test",
          title: "SMTP Test Failed",
          preview: e.message?.slice(0, 100) || "Unknown error",
        });

        return new Response(JSON.stringify({ error: "SMTP test failed: " + e.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Honeypot check
    if (data.website) {
      // Silently accept but don't process (spam bot)
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

      // Save to contact_submissions
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
        expected_attendance: data.expected_attendance?.trim() || "",
        budget: data.budget?.trim() || "",
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

    // Try to send email via SMTP
    let emailQueued = false;
    const { data: smtp } = await supabase.from("smtp_settings").select("*").limit(1).single();

    if (smtp?.host && smtp?.is_verified) {
      try {
        const password = await decryptPassword(smtp.encrypted_password, serviceRoleKey);
        await sendSmtpEmail(smtp, password, "support@buzzweave.com", emailSubject, emailBody, replyTo);
      } catch {
        emailQueued = true;
      }
    } else {
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
