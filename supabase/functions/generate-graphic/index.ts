import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, category, title } = await req.json();
    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(sbUrl, sbKey);

    // 1. Generate image with Lovable AI
    console.log("Generating graphic with prompt:", prompt.substring(0, 100));

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: `Create a professional, high-quality ministry graphic: ${prompt}. Make it visually striking with bold composition suitable for church media use.`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      throw new Error(`AI generation failed (${aiResp.status})`);
    }

    const aiData = await aiResp.json();
    const imageDataUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageDataUrl) {
      throw new Error("AI did not return an image");
    }

    // 2. Convert base64 to binary and upload to storage
    const base64Data = imageDataUrl.split(",")[1];
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const timestamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const fileName = `ai-generated/${timestamp}-${rand}.png`;

    const { error: uploadErr } = await supabase.storage
      .from("graphics")
      .upload(fileName, bytes, { contentType: "image/png", upsert: true });

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      throw new Error(`Failed to save image: ${uploadErr.message}`);
    }

    const { data: urlData } = supabase.storage.from("graphics").getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    // 3. Generate a sensible title from prompt if not provided
    const draftTitle = title?.trim() ||
      prompt.trim().split(/[.,!?]/)[ 0].replace(/^(a |an |the |create |generate |make |design )/i, "").trim().substring(0, 80) ||
      "AI Generated Graphic";

    // Capitalize first letter of each word
    const formattedTitle = draftTitle.replace(/\b\w/g, (c: string) => c.toUpperCase());

    // 4. Create draft record in graphics table
    const { data: graphic, error: insertErr } = await supabase.from("graphics").insert({
      title: formattedTitle,
      description: `AI Generated: ${prompt.substring(0, 200)}`,
      category: category || "AI Generated",
      preview_url: publicUrl,
      file_url: publicUrl,
      is_active: false, // Draft = not active
      price: 0,
      sort_order: 0,
      access_tiers: [],
    }).select().single();

    if (insertErr) {
      console.error("DB insert error:", insertErr);
      throw new Error(`Failed to save graphic record: ${insertErr.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      id: graphic.id,
      title: formattedTitle,
      preview_url: publicUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-graphic error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
