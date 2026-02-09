import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VOICE_MAP: Record<string, string> = {
  "deep-smooth": "JBFqnCBsd6RMkjVDRZzb",     // George - deep, authoritative
  "warm-narrator": "onwK4e9ZLuTAKqWW03F9",    // Daniel - warm narration
  "calm-male": "N2lVS1w4EtoT3dr4eOWO",        // Callum - calm, collected
  "rich-female": "EXAVITQu4vr4xnSDxMaL",      // Sarah - rich female
  "smooth-male": "TX3LPaxmHKxFdv7VOQHJ",      // Liam - smooth
  "classic-narrator": "nPczCjzI2devNBz1zQrb",  // Brian - classic narrator
  "gentle-female": "pFZP5JQG7iQjIQuC4Bku",    // Lily - gentle
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice, title } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ElevenLabs API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Truncate to ElevenLabs limit (5000 chars per request)
    // For longer texts, we chunk and stitch
    const voiceId = VOICE_MAP[voice] || VOICE_MAP["deep-smooth"];
    const chunks: string[] = [];
    const maxChunkSize = 4500;

    // Split text into chunks at sentence boundaries
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = "";
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());

    // Generate audio for each chunk
    const audioBuffers: ArrayBuffer[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const body: Record<string, unknown> = {
        text: chunk,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.4,
          use_speaker_boost: true,
          speed: 0.95,
        },
      };

      // Request stitching for continuity
      if (i > 0) body.previous_text = chunks[i - 1].slice(-200);
      if (i < chunks.length - 1) body.next_text = chunks[i + 1].slice(0, 200);

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error("ElevenLabs error:", response.status, errText);
        return new Response(
          JSON.stringify({ error: `ElevenLabs API error: ${response.status}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      audioBuffers.push(await response.arrayBuffer());
    }

    // Concatenate audio buffers
    const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of audioBuffers) {
      combined.set(new Uint8Array(buf), offset);
      offset += buf.byteLength;
    }

    // Upload to Supabase storage
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fileName = `${Date.now()}-${(title || "audio").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.mp3`;

    const uploadResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/object/audio-files/${fileName}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "audio/mpeg",
        },
        body: combined,
      }
    );

    if (!uploadResponse.ok) {
      const uploadErr = await uploadResponse.text();
      console.error("Upload error:", uploadErr);
      return new Response(
        JSON.stringify({ error: "Failed to upload audio file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/audio-files/${fileName}`;

    return new Response(
      JSON.stringify({ audioUrl, fileName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("TTS error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
