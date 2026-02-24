import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
    const systemPrompt = Deno.env.get("AI_SYSTEM_PROMPT") || "You are a helpful AI assistant for The Island of One ministry. Be warm, encouraging, and faith-driven. Keep answers clear and concise.";

    const { messages, conversationId, action } = await req.json();

    // Auth check
    const authHeader = req.headers.get("Authorization") || "";
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(sbUrl, sbKey);

    // Verify admin via token
    const token = authHeader.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
    
    // Skip auth check if token is just the anon key (for function invocation)
    let userId: string | null = null;
    if (token && token !== anonKey) {
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;

      // Check admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");
      if (!roles?.length) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle listing conversations
    if (action === "list_conversations") {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return new Response(JSON.stringify({ conversations: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle loading messages for a conversation
    if (action === "load_messages") {
      const { data, error } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify({ messages: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle delete conversation
    if (action === "delete_conversation") {
      await supabase.from("ai_conversations").delete().eq("id", conversationId);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Chat completion with streaming
    if (!messages?.length) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create or use existing conversation
    let convId = conversationId;
    if (!convId && userId) {
      const title = (messages[0]?.content || "New Chat").substring(0, 100);
      const { data: conv, error: convErr } = await supabase
        .from("ai_conversations")
        .insert({ user_id: userId, title })
        .select()
        .single();
      if (convErr) console.error("Conv create error:", convErr);
      convId = conv?.id;
    }

    // Save user message
    const userMsg = messages[messages.length - 1];
    if (convId && userMsg?.role === "user") {
      await supabase.from("ai_messages").insert({
        conversation_id: convId,
        role: "user",
        content: userMsg.content,
      });
    }

    // Call OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect full response for DB while streaming
    const reader = response.body!.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let fullContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(encoder.encode(chunk));

            // Parse for DB storage
            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
              try {
                const parsed = JSON.parse(line.slice(6));
                const c = parsed.choices?.[0]?.delta?.content;
                if (c) fullContent += c;
              } catch {}
            }
          }
          
          // Save assistant message to DB
          if (convId && fullContent) {
            await supabase.from("ai_messages").insert({
              conversation_id: convId,
              role: "assistant",
              content: fullContent,
            });
            await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
          }

          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Conversation-Id": convId || "",
      },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
