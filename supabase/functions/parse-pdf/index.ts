import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, mode } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit input size
    if (text.length > 500_000) {
      return new Response(JSON.stringify({ error: "PDF text too large (max 500k chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = mode === "sermon"
      ? `You are a document parser. Given raw text extracted from a PDF of a sermon, produce structured JSON output. Return ONLY valid JSON, no markdown fences.

Format:
{
  "title": "sermon title",
  "scripture": "main scripture reference if found",
  "excerpt": "brief 1-2 sentence summary",
  "manuscript": "the full sermon text, cleaned up with proper paragraph breaks (use \\n\\n between paragraphs)"
}

Rules:
- Clean up formatting artifacts (page numbers, headers/footers, random line breaks mid-sentence)
- Join lines that were broken mid-sentence
- Preserve intentional paragraph breaks
- Extract the title from the document if present
- Extract scripture references if present
- Generate a brief excerpt/summary`
      : `You are a document parser. Given raw text extracted from a PDF of a book, produce structured JSON output. Return ONLY valid JSON, no markdown fences.

Format:
{
  "title": "book title",
  "subtitle": "subtitle if found, empty string otherwise",
  "chapters": [
    {
      "title": "Chapter title",
      "content": "chapter content with proper paragraph breaks (use \\n\\n between paragraphs)"
    }
  ]
}

Rules:
- Detect chapter boundaries using common patterns: "Chapter 1", "CHAPTER ONE", numbered sections, etc.
- Clean up formatting artifacts (page numbers, headers/footers, random line breaks mid-sentence)
- Join lines that were broken mid-sentence  
- Preserve intentional paragraph breaks within chapters
- If no clear chapter markers exist, split into logical sections based on content flow
- Extract the book title and subtitle from the front matter if present
- Omit table of contents, copyright pages, and other non-content pages`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the extracted PDF text:\n\n${text}` },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", errText);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    // Try to parse the JSON from the response
    let parsed;
    try {
      // Strip potential markdown fences
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-pdf error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
