import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const code = new URL(req.url).searchParams.get("code");
  if (!code) {
    return new Response("Missing code", { status: 400, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Verify invite exists
    const { data: invite } = await supabase
      .from("invitations")
      .select("email, status")
      .eq("invite_code", code)
      .maybeSingle();

    if (!invite || invite.status === "accepted") {
      return new Response("This invitation has expired or already been used.", {
        status: 410,
        headers: { "Content-Type": "text/plain", ...corsHeaders },
      });
    }

    // Fetch logo
    const { data: logoSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "logo_url")
      .maybeSingle();

    const { data: fbSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "fb_app_id")
      .maybeSingle();

    const site = "https://theislandofone.lovable.app";
    const ogImage = `${site}/invite-og.jpg`;
    const fbAppId = fbSetting?.value || "1169014871775113";
    const link = `${site}/auth?invite=${code}`;
    const title = "You're Invited to Join The Island of One!";
    const description = "You've been personally invited to join with a FREE lifetime Inner Circle membership. Get full access to all books, sermons, videos, and exclusive content.";

    // Build OG-rich HTML page
    const page = `<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<link rel="canonical" href="${esc(link)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${esc(ogImage)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${esc(link)}" />
<meta property="og:type" content="website" />
<meta property="fb:app_id" content="${esc(fbAppId)}" />
<meta property="og:app_id" content="${esc(fbAppId)}" />
<meta property="og:site_name" content="The Island of One" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(ogImage)}" />
<style>body{font:17px/1.8 Georgia,serif;max-width:700px;margin:80px auto;padding:0 20px;text-align:center;color:#666}</style>
</head><body>
<p>Redirecting to The Island of One&hellip;</p>
<script>window.location.replace("${link.replace(/"/g, '\\"')}");</script>
</body></html>`;

    return new Response(page, {
      headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
    });
  } catch (err) {
    console.error("share-invite error:", err);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
