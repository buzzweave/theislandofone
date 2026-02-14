import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Types ────────────────────────────────────────────────────────────── */

interface SermonPayload {
  title: string;
  scriptureReference?: string;
  scripture?: string;
  manuscript?: string;
}

interface TextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  heading: number;
}

/* ── Constants ────────────────────────────────────────────────────────── */

const A4_W = 595;
const A4_H = 842;
const MARGIN = 72;
const CONTENT_W = A4_W - MARGIN * 2;

/* ── HTML → Styled Segments Parser ───────────────────────────────────── */

function stripInlineTags(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function parseHtmlToSegments(html: string): TextSegment[][] {
  let processed = html
    .replace(/<\/h([1-6])>/gi, (_, n) => `\n__BLOCK_END_H${n}__\n`)
    .replace(/<h([1-6])[^>]*>/gi, (_, n) => `\n__BLOCK_START_H${n}__\n`)
    .replace(/<\/p>/gi, "\n__BLOCK_END__\n")
    .replace(/<p[^>]*>/gi, "\n__BLOCK_START__\n")
    .replace(/<br\s*\/?>/gi, "\n__LINEBREAK__\n")
    .replace(/<\/li>/gi, "\n__BLOCK_END__\n")
    .replace(/<li[^>]*>/gi, "\n__BULLET__\n")
    .replace(/<\/?(?:ul|ol)[^>]*>/gi, "");

  const lines = processed.split("\n").filter(l => l.trim());
  const paragraphs: TextSegment[][] = [];
  let currentHeading = 0;
  let isBullet = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.match(/^__BLOCK_START_H(\d)__$/)) {
      currentHeading = parseInt(trimmed.match(/(\d)/)?.[1] || "0");
      continue;
    }
    if (trimmed.match(/^__BLOCK_END_H\d__$/)) { currentHeading = 0; continue; }
    if (trimmed === "__BLOCK_START__") continue;
    if (trimmed === "__BLOCK_END__") continue;
    if (trimmed === "__LINEBREAK__") {
      paragraphs.push([{ text: "", bold: false, italic: false, heading: 0 }]);
      continue;
    }
    if (trimmed === "__BULLET__") { isBullet = true; continue; }

    const segments: TextSegment[] = [];
    let remaining = isBullet ? "• " + trimmed : trimmed;
    isBullet = false;

    const inlineRegex = /<(strong|b|em|i)(?:\s[^>]*)?>|<\/(strong|b|em|i)>/gi;
    let bold = false;
    let italic = false;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = inlineRegex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        const text = stripInlineTags(remaining.slice(lastIndex, match.index));
        if (text) segments.push({ text, bold, italic, heading: currentHeading });
      }
      const tag = (match[1] || match[2]).toLowerCase();
      if (match[1]) {
        if (tag === "strong" || tag === "b") bold = true;
        if (tag === "em" || tag === "i") italic = true;
      } else {
        if (tag === "strong" || tag === "b") bold = false;
        if (tag === "em" || tag === "i") italic = false;
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < remaining.length) {
      const text = stripInlineTags(remaining.slice(lastIndex));
      if (text) segments.push({ text, bold, italic, heading: currentHeading });
    }

    if (segments.length === 0 && remaining.trim()) {
      const text = stripInlineTags(remaining);
      if (text) segments.push({ text, bold: false, italic: false, heading: currentHeading });
    }

    if (segments.length > 0) paragraphs.push(segments);
  }

  return paragraphs;
}

function findOverlap(line: string, segText: string): string {
  const maxLen = Math.min(line.length, segText.length);
  for (let i = maxLen; i > 0; i--) {
    if (line.substring(0, i) === segText.substring(0, i)) return line.substring(0, i);
  }
  return "";
}

/* ── PDF Generation — WYSIWYG Document ───────────────────────────────── */

function generatePdf(data: SermonPayload): ArrayBuffer {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = MARGIN;
  const contentW = CONTENT_W;
  let y = margin;

  const newPage = () => { doc.addPage(); y = margin; };
  const checkPage = (needed: number) => { if (y + needed > pageH - margin) newPage(); };

  const manuscript = data.manuscript || "";
  const paragraphs = parseHtmlToSegments(manuscript);

  for (const segments of paragraphs) {
    if (segments.length === 1 && segments[0].text === "") {
      y += 12;
      continue;
    }

    const headingLevel = segments[0]?.heading || 0;
    let fontSize = 16;
    let lineHeight = 24;
    let fontFamily = "times";

    if (headingLevel === 1) { fontSize = 28; lineHeight = 36; fontFamily = "helvetica"; }
    else if (headingLevel === 2) { fontSize = 24; lineHeight = 32; fontFamily = "helvetica"; }
    else if (headingLevel === 3) { fontSize = 20; lineHeight = 28; fontFamily = "helvetica"; }
    else if (headingLevel >= 4) { fontSize = 18; lineHeight = 26; fontFamily = "helvetica"; }

    const fullText = segments.map(s => s.text).join("");
    doc.setFontSize(fontSize);
    doc.setFont(fontFamily, "normal");
    const wrappedLines: string[] = doc.splitTextToSize(fullText, contentW);

    const isSingleStyle = segments.length === 1;

    if (isSingleStyle) {
      const seg = segments[0];
      const style = seg.bold && seg.italic ? "bolditalic" : seg.bold ? "bold" : seg.italic ? "italic" : "normal";
      doc.setFont(fontFamily, style);
      doc.setFontSize(fontSize);

      for (const line of wrappedLines) {
        checkPage(lineHeight);
        doc.text(line, margin, y);
        y += lineHeight;
      }
    } else {
      for (const line of wrappedLines) {
        checkPage(lineHeight);
        let xPos = margin;
        let remainingLine = line;

        for (const seg of segments) {
          if (remainingLine.length === 0) break;
          const overlap = findOverlap(remainingLine, seg.text);
          if (overlap) {
            const style = seg.bold && seg.italic ? "bolditalic" : seg.bold ? "bold" : seg.italic ? "italic" : "normal";
            doc.setFont(fontFamily, style);
            doc.setFontSize(fontSize);
            doc.text(overlap, xPos, y);
            xPos += doc.getTextWidth(overlap);
            remainingLine = remainingLine.substring(overlap.length);
          }
        }

        if (remainingLine.length > 0) {
          doc.setFont(fontFamily, "normal");
          doc.text(remainingLine, xPos, y);
        }

        y += lineHeight;
      }
    }

    y += headingLevel > 0 ? 8 : 6;
  }

  // Copyright
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text(
    `\u00A9 ${new Date().getFullYear()} The Island of One. All rights reserved.`,
    pageW / 2,
    pageH - 40,
    { align: "center" },
  );

  return doc.output("arraybuffer");
}

/* ── Handler ─────────────────────────────────────────────────────────── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: SermonPayload = await req.json();

    if (!data.title) {
      return new Response(JSON.stringify({ error: "title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfBuffer = generatePdf(data);
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${slug}-${dateStr}.pdf`;

    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
