import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Authentication failed");

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    if (!roles || roles.length === 0) throw new Error("Admin access required");

    const { videoUrl, title, description, tags, thumbnailUrl } = await req.json();
    if (!videoUrl) throw new Error("videoUrl is required");

    const YOUTUBE_REFRESH_TOKEN = Deno.env.get("YOUTUBE_REFRESH_TOKEN");
    const YOUTUBE_CLIENT_ID = Deno.env.get("YOUTUBE_CLIENT_ID");
    const YOUTUBE_CLIENT_SECRET = Deno.env.get("YOUTUBE_CLIENT_SECRET");

    if (!YOUTUBE_REFRESH_TOKEN || !YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
      throw new Error(
        "YouTube API credentials not configured. Please add YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and YOUTUBE_REFRESH_TOKEN in your project secrets."
      );
    }

    // Refresh access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: YOUTUBE_CLIENT_ID,
        client_secret: YOUTUBE_CLIENT_SECRET,
        refresh_token: YOUTUBE_REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.text();
      throw new Error(`Failed to refresh YouTube token: ${errData}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Download the video file
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error("Failed to download video file");
    const videoBlob = await videoRes.blob();
    const videoBytes = new Uint8Array(await videoBlob.arrayBuffer());

    // Step 1: Resumable upload init
    const metadata = {
      snippet: {
        title: title || "Island of One Video",
        description: description || "Created with Island of One Video Studio",
        tags: tags || [],
        categoryId: "22", // People & Blogs
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    };

    const initRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(videoBytes.length),
          "X-Upload-Content-Type": "video/webm",
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initRes.ok) {
      const errData = await initRes.text();
      throw new Error(`YouTube upload init failed [${initRes.status}]: ${errData}`);
    }

    const uploadUrl = initRes.headers.get("Location");
    if (!uploadUrl) throw new Error("No upload URL returned from YouTube");

    // Step 2: Upload video bytes
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/webm",
        "Content-Length": String(videoBytes.length),
      },
      body: videoBytes,
    });

    if (!uploadRes.ok) {
      const errData = await uploadRes.text();
      throw new Error(`YouTube video upload failed [${uploadRes.status}]: ${errData}`);
    }

    const uploadData = await uploadRes.json();
    const videoId = uploadData.id;

    // Step 3: Upload thumbnail if provided
    if (thumbnailUrl && videoId) {
      try {
        const thumbRes = await fetch(thumbnailUrl);
        if (thumbRes.ok) {
          const thumbBlob = await thumbRes.blob();
          const thumbBytes = new Uint8Array(await thumbBlob.arrayBuffer());
          const contentType = thumbRes.headers.get("content-type") || "image/jpeg";

          await fetch(
            `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": contentType,
              },
              body: thumbBytes,
            }
          );
        }
      } catch (thumbErr) {
        console.error("Thumbnail upload failed (non-fatal):", thumbErr);
      }
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    return new Response(
      JSON.stringify({ success: true, videoId, youtubeUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("YouTube publish error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
