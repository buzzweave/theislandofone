import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req: Request) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) {
    return new Response("Missing slug", { status: 400, headers });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [postResult, settingResult] = await Promise.all([
      supabase.from("blog_posts").select("*").eq("slug", slug).eq("is_published", true).single(),
      supabase.from("site_settings").select("value").eq("key", "fb_app_id").single(),
    ]);

    if (postResult.error || !postResult.data) {
      return new Response("Not found", { status: 404, headers });
    }

    const post = postResult.data;
    const fbAppId = settingResult.data?.value || "1169014871775113";

    const site = "https://theislandofone.com";
    const link = site + "/blog/" + post.slug;
    const fallbackImg = site + "/logo.png";
    const rawImg = post.image_url || fallbackImg;
    const img = rawImg.replace(/^http:\/\//i, "https://");
    const desc = post.excerpt || "Faith, healing, and belonging for the ones who felt alone.";
    const t = post.title;

    const page = `<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<title>${esc(t)}</title>
<link rel="canonical" href="${esc(link)}" />
<meta property="og:title" content="${esc(t)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:image" content="${esc(img)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${esc(link)}" />
<meta property="og:type" content="article" />
<meta property="fb:app_id" content="${esc(fbAppId)}" />
<meta property="og:site_name" content="The Island of One" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(t)}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${esc(img)}" />
<meta http-equiv="refresh" content="2;url=${esc(link)}" />
<style>body{font:17px/1.8 Georgia,serif;max-width:700px;margin:80px auto;padding:0 20px;text-align:center;color:#666}</style>
</head><body>
<p>Redirecting to The Island of One&hellip;</p>
</body></html>`;

    return new Response(page, {
      headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("share-blog error:", err);
    return new Response("Internal error", { status: 500, headers });
  }
});
