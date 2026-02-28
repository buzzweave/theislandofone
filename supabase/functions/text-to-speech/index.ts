import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ELEVENLABS_VOICE_MAP: Record<string, string> = {
  "deep-smooth": "JBFqnCBsd6RMkjVDRZzb",
  "warm-narrator": "onwK4e9ZLuTAKqWW03F9",
  "calm-male": "N2lVS1w4EtoT3dr4eOWO",
  "rich-female": "EXAVITQu4vr4xnSDxMaL",
  "smooth-male": "TX3LPaxmHKxFdv7VOQHJ",
  "classic-narrator": "nPczCjzI2devNBz1zQrb",
  "gentle-female": "pFZP5JQG7iQjIQuC4Bku",
};

const OPENAI_VOICE_OPTIONS = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

const rateLimits = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS = 10;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_TEXT_LENGTH = 100000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS) return false;
  entry.count++;
  return true;
}

async function generateWithElevenLabs(text: string, voiceKey: string): Promise<Uint8Array> {
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  if (!ELEVENLABS_API_KEY) throw new Error("ElevenLabs API key not configured");

  const voiceId = ELEVENLABS_VOICE_MAP[voiceKey] || ELEVENLABS_VOICE_MAP["deep-smooth"];
  const chunks: string[] = [];
  const maxChunkSize = 4500;
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

  const audioBuffers: ArrayBuffer[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const body: Record<string, unknown> = {
      text: chunk,
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.6, similarity_boost: 0.8, style: 0.4, use_speaker_boost: true, speed: 0.95 },
    };
    if (i > 0) body.previous_text = chunks[i - 1].slice(-200);
    if (i < chunks.length - 1) body.next_text = chunks[i + 1].slice(0, 200);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs error:", response.status, errText);
      throw new Error("ElevenLabs TTS error");
    }
    audioBuffers.push(await response.arrayBuffer());
  }

  const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of audioBuffers) {
    combined.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return combined;
}

async function generateWithOpenAI(text: string, voiceKey: string): Promise<Uint8Array> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

  const voice = OPENAI_VOICE_OPTIONS.includes(voiceKey) ? voiceKey : "alloy";

  // OpenAI TTS has a 4096 char limit per request, chunk if needed
  const maxChunk = 4000;
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let currentChunk = "";
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunk && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());

  const audioBuffers: ArrayBuffer[] = [];
  for (const chunk of chunks) {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1-hd",
        input: chunk,
        voice,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI TTS error:", response.status, errText);
      throw new Error("OpenAI TTS error");
    }
    audioBuffers.push(await response.arrayBuffer());
  }

  const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of audioBuffers) {
    combined.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return combined;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid authentication token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await serviceClient
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!checkRateLimit(userId)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Max 10 requests/hour." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, voice, title, provider } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(JSON.stringify({ error: `Text too long (max ${MAX_TEXT_LENGTH} characters)` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let audioData: Uint8Array;
    if (provider === "openai") {
      audioData = await generateWithOpenAI(text, voice);
    } else {
      audioData = await generateWithElevenLabs(text, voice);
    }

    const fileName = `${Date.now()}-${(title || "audio").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.mp3`;

    // Use service role client for storage upload
    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from("audio-files")
      .upload(fileName, audioData, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError.message);
      return new Response(JSON.stringify({ error: "Failed to upload audio file: " + uploadError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicUrlData } = serviceClient.storage
      .from("audio-files")
      .getPublicUrl(fileName);

    const audioUrl = publicUrlData.publicUrl;

    return new Response(JSON.stringify({ audioUrl, fileName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("TTS error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "An internal error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
