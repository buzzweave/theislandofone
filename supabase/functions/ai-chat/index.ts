import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Safe-string helper: guarantees a string, never null/undefined/object
const safeStr = (val: unknown, fallback = ""): string => {
  if (val == null) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  try { return JSON.stringify(val); } catch { return fallback; }
};

// Extract scripture reference: if AI returned an object like {reference, text}, extract just the reference string
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
    if (token && token !== anonKey) {
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (!authErr && user) {
        userId = user.id;
        const { data: roles } = await supabase
          .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
        isAdmin = !!(roles?.length);
      }
    }

    const needsAuth = action === "generate_draft" || action === "delete_conversation";
    if (needsAuth && !isAdmin && token && token !== anonKey) {
      console.log("Auth soft-pass: session may be expired, allowing action:", action);
    }

    // --- Generate Draft (book or sermon) ---
    if (action === "generate_draft") {
      if (!draftType || !userPrompt) {
        return new Response(JSON.stringify({ error: "Missing draftType or userPrompt" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sysPrompt = customSystemPrompt || (draftType === "book"
        ? "You are a Christian book author. Return valid JSON with: title, subtitle, author, description, chapters (array of {title, content}). Each chapter should have at least 300 words."
        : "You are a sermon writer for a Christian ministry. Return valid JSON with these exact keys: title (string — a strong, memorable sermon title), scripture (plain scripture reference string like \"Romans 8:28\" — do NOT return an object), excerpt (a compelling 2-3 sentence summary of the sermon that captures the main theme and draws the reader in), manuscript (the full sermon text as a single string — this is the most important field and must contain the complete sermon body with headings, bullet points, and all content), category (one of: Faith, Worship, Calling, Leadership, Deliverance, Prayer, Family — choose the best fit for the sermon topic). ALL fields are required. The excerpt MUST be a meaningful summary, not empty.");

      console.log(`[generate_draft] Starting ${draftType} generation with model: ${model}`);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: sysPrompt + "\n\nIMPORTANT: Return ONLY valid JSON, no markdown code blocks." },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 8000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[generate_draft] OpenAI API error: ${response.status}`, errText.substring(0, 300));
        return new Response(JSON.stringify({ error: `OpenAI error (${response.status}): ${errText.substring(0, 200)}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiResult = await response.json();
      let content = aiResult.choices?.[0]?.message?.content || "";
      
      console.log(`[generate_draft] OpenAI response received, length: ${content.length}`);

      // Clean markdown code blocks if present
      content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      
      let parsed: Record<string, any>;
      let isPlainText = false;
      try {
        parsed = JSON.parse(content);
      } catch (parseErr) {
        console.log("[generate_draft] JSON parse failed, treating as plain text manuscript");
        isPlainText = true;
        // Extract title from first line if it looks like a heading
        const lines = content.split("\n").map((l: string) => l.trim()).filter(Boolean);
        let extractedTitle = userPrompt;
        let manuscriptBody = content;
        if (lines.length > 0) {
          const firstLine = lines[0].replace(/^#+\s*/, "").replace(/^\*\*(.+)\*\*$/, "$1").trim();
          // Use first line as title if it's short enough and looks like a title
          if (firstLine.length > 3 && firstLine.length < 150) {
            extractedTitle = firstLine;
            // Remove the title line from the manuscript body
            const idx = content.indexOf(lines[0]);
            if (idx >= 0) {
              manuscriptBody = content.substring(idx + lines[0].length).trim();
            }
          }
        }
        // Extract scripture reference if present (e.g. "Scripture: Romans 8:28" or "Text: John 3:16")
        let extractedScripture = "";
        const scriptureMatch = content.match(/(?:scripture|text|passage|reference)\s*[:—–-]\s*(.+)/i);
        if (scriptureMatch) {
          extractedScripture = scriptureMatch[1].trim().replace(/\*+/g, "");
        }
        // Extract category
        let extractedCategory = "Faith";
        const categoryMatch = content.match(/(?:category|theme)\s*[:—–-]\s*(.+)/i);
        if (categoryMatch) {
          const cat = categoryMatch[1].trim();
          const validCats = ["Faith", "Worship", "Calling", "Leadership", "Deliverance", "Prayer", "Family"];
          const found = validCats.find(c => cat.toLowerCase().includes(c.toLowerCase()));
          if (found) extractedCategory = found;
        }
        parsed = {
          title: extractedTitle,
          scripture: extractedScripture,
          manuscript: manuscriptBody || content,
          category: extractedCategory,
          excerpt: "",
        };
      }

      // Log actual keys for debugging
      console.log(`[generate_draft] Parsed ${draftType} JSON keys:`, Object.keys(parsed).join(", "));

      // Unwrap nested sermon object if present (e.g. { sermon: { title, ... } })
      const root: Record<string, any> = parsed.sermon && typeof parsed.sermon === "object" ? { ...parsed, ...parsed.sermon } : parsed;

      // Robust field resolver: tries multiple possible field names on root
      const pick = (...keys: string[]): unknown => {
        for (const k of keys) {
          if (root[k] != null && root[k] !== "") return root[k];
        }
        return undefined;
      };

      // Extract title robustly with fallback to user topic
      const extractTitle = (fallback: string): string => {
        const raw = pick("title", "sermon_title", "name", "heading");
        const title = safeStr(raw);
        if (title && title !== "undefined" && title.length > 2) return title;
        return fallback;
      };

      // Strip prompt artifacts and ensure proper line breaks in manuscript text
      const normalizeManuscriptText = (text: string): string => {
        let t = text;
        // Strip markdown bold wrappers from headings
        t = t.replace(/\*\*([A-Z][A-Z .:'!?0-9\-—–]+)\*\*/g, "$1");
        // Strip prompt artifact prefixes like "BOLD SECTION TITLE:"
        t = t.replace(/(?:BOLD\s+SECTION\s+TITLE|MAIN\s+POINT\s+TITLE(?:\s+IN\s+ALL\s+CAPS)?|SECTION\s+HEADING|SECTION\s+TITLE)\s*[:—–-]\s*/gi, "");
        // Ensure line breaks before Roman numeral headings
        t = t.replace(/([.!?…"')\s])\s*([IVXLCDM]+\.\s+[A-Z])/g, "$1\n\n$2");
        // Ensure line breaks before known section labels when inline
        const labels = [
          "TRUE OPENING ILLUSTRATION", "OPENING ILLUSTRATION", "MID-SERMON ILLUSTRATION",
          "ILLUSTRATION CALLBACK", "ILLUSTRATION", "INTRODUCTION", "CLOSING BUILD",
          "CLOSING DECLARATION", "ALTAR CALL", "APPLICATION", "POWER DECLARATIONS",
          "SCRIPTURE", "CONTINUED MAIN POINTS",
        ];
        for (const label of labels) {
          const re = new RegExp("([.!?…\"')\\s])\\s*(" + label + ")", "gi");
          t = t.replace(re, "$1\n\n$2");
        }
        // Ensure line breaks before KEY POINT
        t = t.replace(/([.!?…"')\s])\s*(KEY\s+POINT\s*[:—–-])/gi, "$1\n\n$2");
        // Ensure line breaks before bullet characters
        t = t.replace(/([.!?…"')\s])\s*([•●]\s)/g, "$1\n$2");
        // Normalize excessive blank lines
        t = t.replace(/\n{3,}/g, "\n\n");
        return t.trim();
      };

      // Render structured AI response into a full manuscript string
      const renderSermonManuscript = (): string => {
        // 1. Check for a direct flat manuscript/content string first
        for (const k of ["manuscript", "content", "body", "sermon_body", "sermonBody", "sermon_content", "text", "full_text"]) {
          const v = root[k];
          if (typeof v === "string" && v.length > 50) return normalizeManuscriptText(v);
        }

        // 2. Build manuscript from structured fields
        const parts: string[] = [];

        // Title
        const title = safeStr(pick("title", "sermon_title"));
        if (title) parts.push(title.toUpperCase());

        // Subtitle
        const subtitle = safeStr(pick("subtitle"));
        if (subtitle) parts.push(subtitle);

        // Scripture
        const scriptureRef = extractScriptureRef(pick("scripture", "scripture_reference", "verse", "reference"));
        const scriptureTextRaw = pick("scripture");
        let scriptureText = "";
        if (scriptureTextRaw && typeof scriptureTextRaw === "object" && (scriptureTextRaw as any).text) {
          scriptureText = safeStr((scriptureTextRaw as any).text);
        }
        if (scriptureRef || scriptureText) {
          let s = "SCRIPTURE";
          if (scriptureRef) s += `\n${scriptureRef}`;
          if (scriptureText) s += `\n\n${scriptureText}`;
          parts.push(s);
        }

        // Opening illustration
        const illRaw = pick("opening_illustration", "openingIllustration", "illustration");
        if (illRaw) {
          const illText = typeof illRaw === "object" && (illRaw as any).content
            ? safeStr((illRaw as any).content)
            : safeStr(illRaw);
          if (illText) parts.push(`OPENING ILLUSTRATION\n\n${illText}`);
        }

        // Main points
        const pointsRaw = pick("main_points", "mainPoints", "points", "sections") as any[];
        if (Array.isArray(pointsRaw)) {
          pointsRaw.forEach((p: any, i: number) => {
            if (typeof p === "string") { parts.push(p); return; }
            const pTitle = safeStr(p.main_point || p.title || p.name || p.heading || `MAIN POINT ${i + 1}`);
            const teaching = safeStr(p.teaching_paragraph || p.teaching || p.content || p.text || p.body || "");
            let section = pTitle;
            if (teaching) section += `\n\n${teaching}`;
            const bullets = p.bullet_points || p.bullets || p.key_points || [];
            if (Array.isArray(bullets)) {
              section += "\n\n" + bullets.map((b: any) => `• ${safeStr(b)}`).join("\n");
            }
            // Key point for this section
            const kp = p.key_point || p.keyPoint || p.summary;
            if (kp) {
              section += `\n\nKEY POINT: ${safeStr(kp)}`;
            }
            parts.push(section);
          });
        }

        // Sermon body (some responses use sermonBody as an object with sections)
        const sermonBodyRaw = pick("sermonBody", "sermon_body");
        if (sermonBodyRaw && typeof sermonBodyRaw === "object" && !Array.isArray(sermonBodyRaw)) {
          const sb = sermonBodyRaw as Record<string, any>;
          for (const [key, val] of Object.entries(sb)) {
            if (typeof val === "string") {
              parts.push(`${key.replace(/([A-Z])/g, " $1").toUpperCase()}\n\n${val}`);
            } else if (typeof val === "object" && val !== null) {
              const heading = safeStr(val.header || val.title || key);
              const body = safeStr(val.content || val.text || "");
              if (body) parts.push(`${heading}\n\n${body}`);
            }
          }
        }

        // Application
        const appRaw = pick("application", "applicationMoments", "application_moments");
        if (appRaw) {
          const appText = typeof appRaw === "string" ? appRaw : safeStr(appRaw);
          if (appText) parts.push(`APPLICATION\n\n${appText}`);
        }

        // Illustration callback
        const cbRaw = pick("illustration_callback", "illustrationCallback");
        if (cbRaw) {
          const cbText = typeof cbRaw === "object" && (cbRaw as any).content ? safeStr((cbRaw as any).content) : safeStr(cbRaw);
          if (cbText) parts.push(`ILLUSTRATION CALLBACK\n\n${cbText}`);
        }

        // Power declarations
        const declRaw = pick("power_declarations", "powerDeclarations", "declaration_moments");
        if (declRaw) {
          if (Array.isArray(declRaw)) {
            parts.push("POWER DECLARATIONS\n\n" + declRaw.map((d: any) => `• ${safeStr(d)}`).join("\n"));
          } else {
            parts.push(`POWER DECLARATIONS\n\n${safeStr(declRaw)}`);
          }
        }

        // Closing
        const closeRaw = pick("closing_declaration", "closingDeclaration", "closing", "closing_structure", "closingStructure");
        if (closeRaw) {
          const closeText = typeof closeRaw === "object" && (closeRaw as any).content
            ? safeStr((closeRaw as any).content)
            : typeof closeRaw === "object" && (closeRaw as any).declaration
              ? safeStr((closeRaw as any).declaration)
              : safeStr(closeRaw);
          if (closeText) parts.push(`CLOSING DECLARATION\n\n${closeText}`);
        }

        return normalizeManuscriptText(parts.join("\n\n"));
      };

      // Save draft to DB
      if (draftType === "book") {
        const bookPayload = {
          title: extractTitle(userPrompt),
          subtitle: safeStr(pick("subtitle")),
          author: safeStr(pick("author"), "Bryant Clark"),
          description: safeStr(pick("description", "summary")),
          is_published: false,
          is_free: true,
          price: 0,
          category: "Faith",
        };
        console.log("[generate_draft] Inserting book:", JSON.stringify(bookPayload));

        const { data: book, error: bookErr } = await supabase.from("books").insert(bookPayload).select().single();

        if (bookErr) {
          console.error("[generate_draft] Book insert FAILED:", JSON.stringify(bookErr));
          throw bookErr;
        }

        console.log(`[generate_draft] Book created. ID: ${book.id}`);

        if (parsed.chapters?.length && book) {
          const chapterRows = parsed.chapters.map((ch: any, i: number) => ({
            book_id: book.id,
            title: ch.title || `Chapter ${i + 1}`,
            content: ch.content || "",
            sort_order: i,
          }));
          const { error: chapErr } = await supabase.from("book_chapters").insert(chapterRows);
          if (chapErr) {
            console.error("[generate_draft] Chapter insert error (non-fatal):", JSON.stringify(chapErr));
          } else {
            console.log(`[generate_draft] ${chapterRows.length} chapters inserted`);
          }
        }

        return new Response(JSON.stringify({ success: true, title: bookPayload.title, id: book?.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // SERMON DRAFT
        const sermonTitle = extractTitle(userPrompt);
        const sermonManuscript = renderSermonManuscript();
        const sermonScripture = extractScriptureRef(pick("scripture", "scripture_reference", "verse", "reference"));
        let sermonExcerpt = safeStr(pick("excerpt", "summary", "description"));
        const sermonCategory = safeStr(pick("category"), "Faith");

        // Auto-generate excerpt from manuscript if AI didn't provide one
        if (!sermonExcerpt || sermonExcerpt.length < 10) {
          // Extract first meaningful paragraph (skip headings/bullets)
          const lines = sermonManuscript.split("\n").filter((l: string) => {
            const t = l.trim();
            return t.length > 30 && !t.startsWith("•") && !t.startsWith("-") && !t.startsWith("*") && t !== t.toUpperCase();
          });
          if (lines.length > 0) {
            // Take first 2 sentences or 250 chars
            const raw = lines.slice(0, 2).join(" ");
            sermonExcerpt = raw.length > 250 ? raw.substring(0, 247) + "..." : raw;
          }
        }

        console.log("[generate_draft] Rendered manuscript length:", sermonManuscript.length);
        console.log("[generate_draft] Title:", sermonTitle);

        // Validate: do not save empty sermons
        if (!sermonManuscript || sermonManuscript.length < 50) {
          console.error("[generate_draft] Sermon manuscript too short! Length:", sermonManuscript.length);
          console.error("[generate_draft] Root keys:", Object.keys(root).join(", "));
          console.error("[generate_draft] Raw preview:", content.substring(0, 1000));
          return new Response(JSON.stringify({ 
            error: "Generated sermon content was empty or too short. The AI may have used unexpected field names. Please try again.", 
            raw_keys: Object.keys(root),
          }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const sermonPayload = {
          title: sermonTitle,
          scripture: sermonScripture,
          excerpt: sermonExcerpt,
          manuscript: sermonManuscript,
          category: sermonCategory,
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

        console.log("[generate_draft] Inserting sermon:", JSON.stringify({
          title: sermonPayload.title,
          category: sermonPayload.category,
          scripture: sermonPayload.scripture,
          manuscript_length: sermonPayload.manuscript.length,
          excerpt_length: sermonPayload.excerpt.length,
        }));

        const { data: sermon, error: sermonErr } = await supabase
          .from("sermons")
          .insert(sermonPayload)
          .select()
          .single();

        if (sermonErr) {
          console.error("[generate_draft] Sermon insert FAILED:", JSON.stringify(sermonErr));
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Database save failed: ${sermonErr.message}`,
            generatedContent: {
              title: sermonPayload.title,
              scripture: sermonPayload.scripture,
              excerpt: sermonPayload.excerpt,
              manuscript: sermonPayload.manuscript,
              category: sermonPayload.category,
            }
          }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log(`[generate_draft] Sermon saved! ID: ${sermon.id}, Title: "${sermon.title}", Manuscript: ${sermonPayload.manuscript.length} chars`);

        return new Response(JSON.stringify({ success: true, title: sermon.title, id: sermon.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- List conversations ---
    if (action === "list_conversations") {
      const { data, error } = await supabase
        .from("ai_conversations").select("*").order("updated_at", { ascending: false }).limit(50);
      if (error) throw error;
      return new Response(JSON.stringify({ conversations: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Load messages ---
    if (action === "load_messages") {
      const { data, error } = await supabase
        .from("ai_messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify({ messages: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Delete conversation ---
    if (action === "delete_conversation") {
      await supabase.from("ai_conversations").delete().eq("id", conversationId);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Chat completion with streaming ---
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