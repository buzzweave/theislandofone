import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const safeStr = (val: unknown, fallback = ""): string => {
  if (val == null) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  try { return JSON.stringify(val); } catch { return fallback; }
};

const extractScriptureRef = (val: unknown): string => {
  if (val == null) return "";
  if (typeof val === "string") {
    if (val.trim().startsWith("{")) {
      try {
        const obj = JSON.parse(val);
        return String(obj.reference || obj.ref || obj.scripture || obj.verse || "");
      } catch { return val; }
    }
    return val;
  }
  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    return String(obj.reference || obj.ref || obj.scripture || obj.verse || "");
  }
  return String(val);
};

// ── Sermon tool schema for structured output via tool calling ──
const SERMON_TOOL = {
  type: "function",
  function: {
    name: "save_sermon",
    description: "Save a generated sermon with all required fields",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "A strong, memorable sermon title" },
        scripture_reference: { type: "string", description: "Scripture reference like 'Romans 8:28 (KJV)'" },
        category: { type: "string", enum: ["Faith", "Worship", "Calling", "Leadership", "Deliverance", "Prayer", "Family"] },
        excerpt: { type: "string", description: "A compelling 2-3 sentence summary of the sermon" },
        full_text: { type: "string", description: "The COMPLETE formatted sermon manuscript with section headings in ALL CAPS, bullet points using •, and clear paragraph breaks. Must include: OPENING ILLUSTRATION, SCRIPTURE, MAIN POINT I, MAIN POINT II, MAIN POINT III, CLOSING DECLARATION, ALTAR CALL sections." },
      },
      required: ["title", "scripture_reference", "category", "excerpt", "full_text"],
      additionalProperties: false,
    },
  },
};

// ── Book tool schema ──
const BOOK_TOOL = {
  type: "function",
  function: {
    name: "save_book",
    description: "Save a generated book with all required fields",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Book title" },
        subtitle: { type: "string", description: "Book subtitle" },
        author: { type: "string", description: "Author name" },
        description: { type: "string", description: "Book description/summary" },
        chapters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              content: { type: "string" },
            },
            required: ["title", "content"],
          },
          description: "Array of chapters, each with title and content (minimum 500 words per chapter)",
        },
      },
      required: ["title", "subtitle", "author", "description", "chapters"],
      additionalProperties: false,
    },
  },
};

const SERMON_SYSTEM_PROMPT = `You are a MASTER sermon writer channeling a Jentezen Franklin + T.D. Jakes hybrid voice.

TONE RULES:
- Prophetic authority — every line carries weight
- Rhythmic momentum — build intensity through every section
- Revelation-heavy (T.D. Jakes style insight layers) — expose deeper meaning, reveal unseen spiritual principles, shift perspective mid-thought
- Declarative, NOT conversational
- NO filler language, NO generic church clichés, NO passive tone
- Present-tense authority throughout

You MUST call the save_sermon function. The full_text field must contain the COMPLETE sermon manuscript (1500+ words) formatted EXACTLY as follows. Every section is MANDATORY.

SERMON NOTES

[1–2 strong prophetic paragraphs. Establish tension, authority, and revelation immediately. No warm-up filler.]

ILLUSTRATION

[A REAL, SPECIFIC illustration from science, nature, history, or biology. Must feel vivid, detailed, and cinematic. Second paragraph MUST clearly connect it spiritually with prophetic authority.]

KEY TRUTH

• [Exactly 2 sentences of revelation, not repetition]
• [Exactly 2 sentences of revelation, not repetition]
• [Exactly 2 sentences of revelation, not repetition]
• [Exactly 2 sentences of revelation, not repetition]

I. [FIRST MAIN POINT TITLE IN ALL CAPS]

[Strong teaching paragraph with authority]

• [Exactly 2 sentences — must sound like preaching, not teaching]
• [Exactly 2 sentences — must sound like preaching, not teaching]
• [Exactly 2 sentences — must sound like preaching, not teaching]
• [Exactly 2 sentences — must sound like preaching, not teaching]

KEY POINT: [One strong paragraph with authority — no filler]

II. [SECOND MAIN POINT TITLE IN ALL CAPS]

[Strong teaching paragraph with authority]

• [Exactly 2 sentences — preaching voice]
• [Exactly 2 sentences — preaching voice]
• [Exactly 2 sentences — preaching voice]
• [Exactly 2 sentences — preaching voice]

KEY POINT: [One strong paragraph reinforcing revelation]

MIDWAY ILLUSTRATION

[MANDATORY HIGH-POWER illustration. ONLY use: scientific phenomena (rockets, pressure, physics, biology), historical breakthrough moments, or extreme natural events (storms, oceans, predators, survival). Must be specific, vivid, and cinematic. Second paragraph MUST connect it spiritually with prophetic authority.]

III. [THIRD MAIN POINT TITLE IN ALL CAPS]

[Strong teaching paragraph declaring authority]

• [Exactly 2 sentences — prophetic preaching]
• [Exactly 2 sentences — prophetic preaching]
• [Exactly 2 sentences — prophetic preaching]
• [Exactly 2 sentences — prophetic preaching]

KEY POINT: [One strong paragraph declaring authority]

CLOSING DECLARATION

• [Exactly 2 sentences — prophetic declaration]
• [Exactly 2 sentences — prophetic declaration]
• [Exactly 2 sentences — prophetic declaration]
• [Exactly 2 sentences — prophetic declaration]

ALTAR CALL

[Strong, DIRECT, COMMANDING altar call. NO filler phrases. NO rambling. NO weak emotional language. MUST be authoritative and urgent. MUST include repeat-after-me declarations. MUST sound like a moment of decision, not suggestion.]

CRITICAL FORMATTING RULES:
- Section headings MUST be ALL CAPS on their own line
- Use bullet character for ALL bullet points — NEVER write bullets as paragraphs
- Each bullet section MUST have EXACTLY 4 bullets
- Each bullet MUST be EXACTLY 2 sentences
- Include clear paragraph breaks between all sections
- Sermon must be at least 1500 words
- Every section must build momentum — no section should feel flat
- NO generic church language, NO repeated phrases, NO soft transitions`;

const BOOK_SYSTEM_PROMPT = `You are a Christian book author writing in an engaging, faith-driven style similar to Jentezen Franklin. Generate a complete book with substantial chapters.

You MUST call the save_book function with ALL fields. Each chapter must have at least 500 words of content. Include a Preface as the first chapter. Write with passion, biblical depth, and practical application.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const model = "gpt-4o-mini";
    const systemPrompt = "You are a helpful AI assistant for The Island of One ministry. Be warm, encouraging, and faith-driven. Keep answers clear and concise.";

    const body = await req.json();
    const { messages, conversationId, action, draftType, systemPrompt: customSystemPrompt, userPrompt } = body;

    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(sbUrl, sbKey);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

    let userId: string | null = null;
    let isAdmin = false;
    if (!token || token === anonKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    userId = user.id;
    {
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
      isAdmin = !!(roles?.length);
    }

    // ═══════════════════════════════════════════════════════
    // GENERATE DRAFT (book or sermon) — tool calling approach
    // ═══════════════════════════════════════════════════════
    if (action === "generate_draft") {
      if (!draftType || !userPrompt) {
        return new Response(JSON.stringify({ error: "Missing draftType or userPrompt" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isSermon = draftType !== "book";
      const sysPrompt = customSystemPrompt || (isSermon ? SERMON_SYSTEM_PROMPT : BOOK_SYSTEM_PROMPT);
      const tool = isSermon ? SERMON_TOOL : BOOK_TOOL;
      const toolName = isSermon ? "save_sermon" : "save_book";

      console.log(`[generate_draft] Starting ${draftType} generation for: "${userPrompt.substring(0, 100)}"`);

      // ── Attempt 1: Tool calling for guaranteed structure ──
      let parsed: Record<string, any> | null = null;

      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: sysPrompt },
              { role: "user", content: userPrompt },
            ],
            tools: [tool],
            tool_choice: { type: "function", function: { name: toolName } },
            max_tokens: 8000,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[generate_draft] Attempt 1 API error: ${response.status}`, errText.substring(0, 300));
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const aiResult = await response.json();
        const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

        if (toolCall?.function?.arguments) {
          console.log(`[generate_draft] Tool call received, parsing arguments (${toolCall.function.arguments.length} chars)`);
          parsed = JSON.parse(toolCall.function.arguments);
          console.log(`[generate_draft] Attempt 1 SUCCESS — keys: ${Object.keys(parsed!).join(", ")}`);
        } else {
          // Model returned content instead of tool call — try to extract
          const content = aiResult.choices?.[0]?.message?.content || "";
          console.log(`[generate_draft] No tool call, got content (${content.length} chars), trying JSON parse`);
          const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
          try {
            parsed = JSON.parse(cleaned);
          } catch {
            // Content is plain text — use as manuscript
            if (isSermon && content.length > 100) {
              parsed = { title: userPrompt, full_text: content, scripture_reference: "", category: "Faith", excerpt: "" };
            }
          }
        }
      } catch (e) {
        console.error(`[generate_draft] Attempt 1 failed:`, e);
      }

      // ── Attempt 2: Plain text fallback if attempt 1 failed ──
      if (!parsed || (isSermon && !parsed.full_text && !parsed.manuscript && !parsed.content)) {
        console.log(`[generate_draft] Attempt 2: plain text fallback`);
        try {
          const fallbackPrompt = isSermon
            ? `Write a complete sermon on: "${userPrompt}" in the prophetic preaching voice of Jentezen Franklin and T.D. Jakes. Tone: prophetic authority, rhythmic momentum, revelation-heavy, declarative. NO filler language.

Use these section headings in ALL CAPS on their own lines:
SERMON NOTES (1-2 prophetic paragraphs)
ILLUSTRATION (real, specific, vivid — from science, nature, history, or biology)
KEY TRUTH (exactly 4 bullet points, each exactly 2 sentences)
I. [MAIN POINT TITLE] (teaching paragraph + exactly 4 bullets of 2 sentences each + KEY POINT paragraph)
II. [MAIN POINT TITLE] (same structure)
MIDWAY ILLUSTRATION (high-power: scientific phenomena, historical breakthroughs, or extreme natural events)
III. [MAIN POINT TITLE] (same structure)
CLOSING DECLARATION (exactly 4 bullets, each 2 sentences)
ALTAR CALL (authoritative, urgent, with repeat-after-me declarations)

Use the bullet character for all bullet points. Write at least 1500 words.`
            : `Write a complete Christian book about: "${userPrompt}". Include a Preface and at least 5 chapters. Each chapter should be at least 500 words. Write in an engaging, faith-driven style.`;

          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: fallbackPrompt }],
              max_tokens: 8000,
              temperature: 0.7,
            }),
          });

          if (response.ok) {
            const aiResult = await response.json();
            const content = aiResult.choices?.[0]?.message?.content || "";
            console.log(`[generate_draft] Attempt 2 got ${content.length} chars`);

            if (content.length > 100) {
              if (isSermon) {
                // Extract title from first line
                const lines = content.split("\n").map((l: string) => l.trim()).filter(Boolean);
                let title = userPrompt;
                let manuscriptBody = content;
                if (lines.length > 0) {
                  const firstLine = lines[0].replace(/^#+\s*/, "").replace(/^\*\*(.+)\*\*$/, "$1").trim();
                  if (firstLine.length > 3 && firstLine.length < 150) {
                    title = firstLine;
                    const idx = content.indexOf(lines[0]);
                    if (idx >= 0) manuscriptBody = content.substring(idx + lines[0].length).trim();
                  }
                }
                let scripture = "";
                const scriptureMatch = content.match(/(?:scripture|text|passage)\s*[:—–-]\s*(.+)/i);
                if (scriptureMatch) scripture = scriptureMatch[1].trim().replace(/\*+/g, "").substring(0, 150);

                parsed = { title, full_text: manuscriptBody, scripture_reference: scripture, category: "Faith", excerpt: "" };
              } else {
                // Book: split by chapter headings
                parsed = { title: userPrompt, subtitle: "", author: "Bryant Clark", description: "", chapters: [{ title: "Full Content", content }] };
                // Try to split chapters
                const chapterSplits = content.split(/\n(?=(?:Chapter\s+\d+|CHAPTER\s+\d+|Preface|PREFACE)\b)/i);
                if (chapterSplits.length > 1) {
                  parsed.chapters = chapterSplits.map((c: string, i: number) => {
                    const firstLine = c.split("\n")[0]?.replace(/^#+\s*/, "").replace(/\*+/g, "").trim() || `Chapter ${i + 1}`;
                    return { title: firstLine, content: c.trim() };
                  });
                }
              }
              console.log(`[generate_draft] Attempt 2 SUCCESS`);
            }
          }
        } catch (e2) {
          console.error(`[generate_draft] Attempt 2 failed:`, e2);
        }
      }

      // ── Final check ──
      if (!parsed) {
        return new Response(JSON.stringify({ error: "AI generation failed after 2 attempts. Please try again." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Normalize and save ──
      if (draftType === "book") {
        const bookPayload = {
          title: safeStr(parsed.title, userPrompt),
          subtitle: safeStr(parsed.subtitle),
          author: safeStr(parsed.author, "Bryant Clark"),
          description: safeStr(parsed.description),
          is_published: false,
          is_free: true,
          price: 0,
          category: "Faith",
        };
        console.log("[generate_draft] Inserting book:", bookPayload.title);

        const { data: book, error: bookErr } = await supabase.from("books").insert(bookPayload).select().single();
        if (bookErr) {
          console.error("[generate_draft] Book insert FAILED:", JSON.stringify(bookErr));
          throw bookErr;
        }

        if (parsed.chapters?.length && book) {
          const chapterRows = parsed.chapters.map((ch: any, i: number) => ({
            book_id: book.id,
            title: safeStr(ch.title, `Chapter ${i + 1}`),
            content: safeStr(ch.content),
            sort_order: i,
          }));
          const { error: chapErr } = await supabase.from("book_chapters").insert(chapterRows);
          if (chapErr) console.error("[generate_draft] Chapter insert error:", JSON.stringify(chapErr));
          else console.log(`[generate_draft] ${chapterRows.length} chapters inserted`);
        }

        return new Response(JSON.stringify({ success: true, title: bookPayload.title, id: book?.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // ── SERMON ──
        const title = safeStr(parsed.title, userPrompt);

        // Get manuscript: prefer full_text, then manuscript, then content
        let manuscript = safeStr(parsed.full_text || parsed.manuscript || parsed.content || parsed.body || parsed.sermon_body || parsed.text);

        // Normalize manuscript formatting
        manuscript = manuscript
          .replace(/\*\*([A-Z][A-Z .:'!?0-9\-—–]+)\*\*/g, "$1")
          .replace(/(?:BOLD\s+SECTION\s+TITLE|MAIN\s+POINT\s+TITLE(?:\s+IN\s+ALL\s+CAPS)?|SECTION\s+HEADING|SECTION\s+TITLE)\s*[:—–-]\s*/gi, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim();

        const scripture = extractScriptureRef(parsed.scripture_reference || parsed.scripture || parsed.verse || "");
        const category = safeStr(parsed.category, "Faith");

        // Auto-generate excerpt
        let excerpt = safeStr(parsed.excerpt);
        if (!excerpt || excerpt.length < 10) {
          const lines = manuscript.split("\n").filter((l: string) => {
            const t = l.trim();
            return t.length > 30 && !t.startsWith("•") && !t.startsWith("-") && t !== t.toUpperCase();
          });
          if (lines.length > 0) {
            const raw = lines.slice(0, 2).join(" ");
            excerpt = raw.length > 250 ? raw.substring(0, 247) + "..." : raw;
          }
        }

        console.log(`[generate_draft] Sermon — title: "${title}", manuscript: ${manuscript.length} chars, scripture: "${scripture}"`);

        // Only reject if truly empty
        if (manuscript.length < 20) {
          console.error("[generate_draft] Manuscript truly empty, parsed keys:", Object.keys(parsed).join(", "));
          return new Response(JSON.stringify({
            error: "AI returned no sermon content. Please try again.",
            raw_keys: Object.keys(parsed),
          }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const sermonPayload = {
          title,
          scripture,
          excerpt,
          manuscript,
          category,
          is_free: true,
          price: 0,
          is_published: false,
          access_level: "free",
          access_tiers: [] as string[],
          featured: false,
          preview_cutoff: 2,
          sort_order: 0,
          date: new Date().toISOString().slice(0, 10),
        };

        const { data: sermon, error: sermonErr } = await supabase.from("sermons").insert(sermonPayload).select().single();

        if (sermonErr) {
          console.error("[generate_draft] Sermon insert FAILED:", JSON.stringify(sermonErr));
          return new Response(JSON.stringify({
            success: false,
            error: `Database save failed: ${sermonErr.message}`,
            generatedContent: { title, scripture, excerpt, manuscript, category },
          }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log(`[generate_draft] Sermon saved! ID: ${sermon.id}, Title: "${title}", ${manuscript.length} chars`);

        return new Response(JSON.stringify({ success: true, title: sermon.title, id: sermon.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── List conversations ──
    if (action === "list_conversations") {
      const { data, error } = await supabase
        .from("ai_conversations").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(50);
      if (error) throw error;
      return new Response(JSON.stringify({ conversations: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Load messages — verify conversation ownership ──
    if (action === "load_messages") {
      const { data: conv } = await supabase
        .from("ai_conversations").select("user_id").eq("id", conversationId).maybeSingle();
      if (!conv || (conv.user_id !== userId && !isAdmin)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase
        .from("ai_messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify({ messages: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Delete conversation — verify ownership ──
    if (action === "delete_conversation") {
      const { data: conv } = await supabase
        .from("ai_conversations").select("user_id").eq("id", conversationId).maybeSingle();
      if (!conv || (conv.user_id !== userId && !isAdmin)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase.from("ai_conversations").delete().eq("id", conversationId);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Chat completion with streaming ──
    if (!messages?.length) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let convId = conversationId;
    if (!convId && userId) {
      const title = (messages[0]?.content || "New Chat").substring(0, 100);
      const { data: conv } = await supabase
        .from("ai_conversations").insert({ user_id: userId, title }).select().single();
      convId = conv?.id;
    }

    const userMsg = messages[messages.length - 1];
    if (convId && userMsg?.role === "user") {
      await supabase.from("ai_messages").insert({
        conversation_id: convId, role: "user", content: userMsg.content,
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);
      return new Response(JSON.stringify({ error: `OpenAI error (${response.status})` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
              try {
                const p = JSON.parse(line.slice(6));
                const c = p.choices?.[0]?.delta?.content;
                if (c) fullContent += c;
              } catch {}
            }
          }
          if (convId && fullContent) {
            await supabase.from("ai_messages").insert({
              conversation_id: convId, role: "assistant", content: fullContent,
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
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Conversation-Id": convId || "" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
