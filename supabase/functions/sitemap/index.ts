import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const siteUrl = "https://theislandofone.lovable.app";
  const now = new Date().toISOString().split("T")[0];

  // Static pages with SEO keywords as comments
  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "weekly" },
    { loc: "/books", priority: "0.9", changefreq: "weekly" },
    { loc: "/sermons", priority: "0.9", changefreq: "weekly" },
    { loc: "/videos", priority: "0.8", changefreq: "weekly" },
    { loc: "/graphics", priority: "0.7", changefreq: "monthly" },
    { loc: "/blog", priority: "0.8", changefreq: "daily" },
    { loc: "/speaking", priority: "0.7", changefreq: "monthly" },
    { loc: "/about", priority: "0.6", changefreq: "monthly" },
    { loc: "/contact", priority: "0.6", changefreq: "monthly" },
    { loc: "/membership", priority: "0.8", changefreq: "monthly" },
    { loc: "/community", priority: "0.6", changefreq: "weekly" },
    { loc: "/privacy", priority: "0.3", changefreq: "yearly" },
    { loc: "/terms", priority: "0.3", changefreq: "yearly" },
    { loc: "/copyright", priority: "0.3", changefreq: "yearly" },
  ];

  // Fetch dynamic content
  const [booksRes, sermonsRes, blogRes] = await Promise.all([
    supabase.from("books").select("id, updated_at, title, category").order("sort_order"),
    supabase.from("sermons").select("id, updated_at, title, category").order("sort_order"),
    supabase.from("blog_posts").select("slug, updated_at, title").eq("is_published", true).order("published_at", { ascending: false }),
  ]);

  const books = booksRes.data || [];
  const sermons = sermonsRes.data || [];
  const blogPosts = blogRes.data || [];

  let urls = "";

  // Static pages
  for (const page of staticPages) {
    urls += `
  <url>
    <loc>${siteUrl}${page.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  }

  // Books
  for (const book of books) {
    const lastmod = book.updated_at?.split("T")[0] || now;
    urls += `
  <url>
    <loc>${siteUrl}/books/${book.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }

  // Sermons
  for (const sermon of sermons) {
    const lastmod = sermon.updated_at?.split("T")[0] || now;
    urls += `
  <url>
    <loc>${siteUrl}/sermons/${sermon.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }

  // Blog posts
  for (const post of blogPosts) {
    const lastmod = post.updated_at?.split("T")[0] || now;
    urls += `
  <url>
    <loc>${siteUrl}/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
});
