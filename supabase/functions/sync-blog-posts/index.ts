import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all posts from VPS
    const res = await fetch("https://api.theislandofone.com/api/blog-posts");
    if (!res.ok) {
      throw new Error(`VPS API returned ${res.status}`);
    }
    const posts = await res.json();

    let synced = 0;
    for (const post of posts) {
      const { error } = await supabase.from("blog_posts").upsert(
        {
          slug: post.slug,
          title: post.title,
          author: post.author || "",
          excerpt: post.excerpt || "",
          content: post.content || "",
          image_url: (post.image_url || "").replace(/^http:\/\//i, "https://"),
          is_published: post.is_published ?? true,
          published_at: post.published_at || post.created_at || new Date().toISOString(),
        },
        { onConflict: "slug" }
      );
      if (error) {
        console.error(`Failed to upsert "${post.slug}":`, error.message);
      } else {
        synced++;
      }
    }

    return new Response(JSON.stringify({ synced, total: posts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync-blog-posts error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
