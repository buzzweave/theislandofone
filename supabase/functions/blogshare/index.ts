import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return new Response("Missing slug", { status: 400, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: post, error } = await supabase
      .from("blog_posts")
      .select("title, excerpt, image_url, slug, content, author, published_at")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (error || !post) {
      return new Response("Post not found", { status: 404, headers: corsHeaders });
    }

    const siteUrl = "https://theislandofone.lovable.app";
    const blogUrl = siteUrl + "/blog/" + post.slug;
    const imageUrl = post.image_url || siteUrl + "/logo.png";

    const plainContent = (post.content || "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();

    const description = post.excerpt || plainContent.substring(0, 300);

    const html = "<!DOCTYPE html><html lang=\"en\"><head>"
      + "<meta charset=\"UTF-8\">"
      + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">"
      + "<title>" + esc(post.title) + " | The Island of One</title>"
      + "<meta property=\"og:title\" content=\"" + esc(post.title) + "\" />"
      + "<meta property=\"og:description\" content=\"" + esc(description) + "\" />"
      + "<meta property=\"og:image\" content=\"" + esc(imageUrl) + "\" />"
      + "<meta property=\"og:image:width\" content=\"1200\" />"
      + "<meta property=\"og:image:height\" content=\"630\" />"
      + "<meta property=\"og:url\" content=\"" + esc(blogUrl) + "\" />"
      + "<meta property=\"og:type\" content=\"article\" />"
      + "<meta property=\"og:site_name\" content=\"The Island of One\" />"
      + (post.author ? "<meta property=\"article:author\" content=\"" + esc(post.author) + "\" />" : "")
      + "<meta name=\"twitter:card\" content=\"summary_large_image\" />"
      + "<meta name=\"twitter:title\" content=\"" + esc(post.title) + "\" />"
      + "<meta name=\"twitter:image\" content=\"" + esc(imageUrl) + "\" />"
      + "<meta http-equiv=\"refresh\" content=\"0;url=" + blogUrl + "\" />"
      + "<style>* { user-select: none; -webkit-user-select: none; } body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #222; background: #fafafa; } h1 { font-size: 28px; margin-bottom: 8px; } .meta { color: #888; font-size: 14px; margin-bottom: 24px; } img { width: 100%; border-radius: 8px; margin-bottom: 24px; } .content { line-height: 1.8; font-size: 17px; } .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center; }</style>"
      + "</head>"
      + "<body oncontextmenu=\"return false\" oncopy=\"return false\" oncut=\"return false\">"
      + (post.image_url ? "<img src=\"" + esc(post.image_url) + "\" alt=\"" + esc(post.title) + "\" />" : "")
      + "<h1>" + esc(post.title) + "</h1>"
      + "<div class=\"meta\">" + (post.author ? "By " + esc(post.author) : "") + "</div>"
      + "<div class=\"content\">" + (post.content || "") + "</div>"
      + "<div class=\"footer\">&copy; " + new Date().getFullYear() + " The Island of One Ministries. All rights reserved.<br>"
      + "<a href=\"" + blogUrl + "\">Read on The Island of One</a></div>"
      + "<script>document.addEventListener('keydown', function(e) { if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'a' || e.key === 'u' || e.key === 's' || e.key === 'p')) { e.preventDefault(); } });</script>"
      + "</body></html>";

    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
