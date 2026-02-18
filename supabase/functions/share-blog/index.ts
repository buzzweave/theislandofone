import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, excerpt, image_url, slug, content, author")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!post) {
    return new Response("Not found", { status: 404, headers });
  }

  const site = "https://theislandofone.lovable.app";
  const link = site + "/blog/" + post.slug;
  const img = post.image_url || site + "/logo.png";
  const desc = post.excerpt || (post.content || "").replace(/<[^>]*>/g, "").substring(0, 300);
  const t = post.title;
  const a = post.author || "";

  const page = [
    "<!DOCTYPE html><html><head>",
    '<meta charset="UTF-8">',
    "<title>" + t + "</title>",
    '<meta property="og:title" content="' + t.replace(/"/g, "&quot;") + '" />',
    '<meta property="og:description" content="' + desc.replace(/"/g, "&quot;") + '" />',
    '<meta property="og:image" content="' + img + '" />',
    '<meta property="og:url" content="' + link + '" />',
    '<meta property="og:type" content="article" />',
    '<meta property="og:site_name" content="The Island of One" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    '<meta name="twitter:image" content="' + img + '" />',
    '<meta http-equiv="refresh" content="0;url=' + link + '" />',
    "<style>*{user-select:none}body{font:17px/1.8 Georgia,serif;max-width:700px;margin:40px auto;padding:0 20px}</style>",
    "</head><body oncontextmenu='return false' oncopy='return false'>",
    img !== site + "/logo.png" ? '<img src="' + img + '" style="width:100%;border-radius:8px">' : "",
    "<h1>" + t + "</h1>",
    a ? "<p style='color:#888;font-size:14px'>By " + a + "</p>" : "",
    "<div>" + (post.content || "") + "</div>",
    "<p style='font-size:12px;color:#999;text-align:center;margin-top:40px'>&copy; 2026 The Island of One Ministries</p>",
    "<script>document.onkeydown=function(e){if((e.ctrlKey||e.metaKey)&&'caups'.includes(e.key))e.preventDefault()}</script>",
    "</body></html>"
  ].join("\n");

  return new Response(page, {
    headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
  });
});
