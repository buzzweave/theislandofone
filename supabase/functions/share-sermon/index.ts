const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return new Response("Missing id", { status: 400, headers: corsHeaders });
  }

  try {
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Fetch sermon from local DB
    const sermonRes = await fetch(`${sbUrl}/rest/v1/sermons?id=eq.${encodeURIComponent(id)}&select=*&limit=1`, {
      headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
    });
    const sermons = await sermonRes.json();

    // Fallback to VPS API
    let sermon = sermons?.[0];
    if (!sermon) {
      const apiRes = await fetch(`https://api.theislandofone.com/api/sermons/${id}`);
      if (!apiRes.ok) {
        return new Response("Not found", { status: 404, headers: corsHeaders });
      }
      sermon = await apiRes.json();
    }

    // Fetch fb_app_id
    const settingRes = await fetch(`${sbUrl}/rest/v1/site_settings?key=eq.fb_app_id&select=value&limit=1`, {
      headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
    });
    const settings = await settingRes.json();
    const fbAppId = settings?.[0]?.value || "1169014871775113";

    const site = "https://theislandofone.com";
    const link = `${site}/sermons/${id}`;
    const fallbackImg = `${site}/logo.png`;
    const t = sermon.title || "Sermon";
    const desc = sermon.excerpt || sermon.scripture || "A sermon from The Island of One Ministries.";

    const page = `<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<title>${esc(t)}</title>
<link rel="canonical" href="${esc(link)}" />
<meta property="og:title" content="${esc(t)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:image" content="${esc(fallbackImg)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${esc(link)}" />
<meta property="og:type" content="article" />
<meta property="fb:app_id" content="${esc(fbAppId)}" />
<meta property="og:app_id" content="${esc(fbAppId)}" />
<meta property="og:site_name" content="The Island of One" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(t)}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${esc(fallbackImg)}" />
<meta http-equiv="refresh" content="2;url=${esc(link)}" />
<style>body{font:17px/1.8 Georgia,serif;max-width:700px;margin:80px auto;padding:0 20px;text-align:center;color:#666}</style>
</head><body>
<p>Redirecting to The Island of One&hellip;</p>
</body></html>`;

    return new Response(page, {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("share-sermon error:", err);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
