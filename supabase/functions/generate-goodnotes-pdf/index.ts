import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SermonPayload {
  title: string;
  scriptureReference?: string;
  scripture?: string;
  manuscript?: string;
}

interface MainPoint {
  heading: string;
  bullets: string[];
}

/* ── Portrait A4 ─────────────────────────────────────────────────────── */

const A4_W = 595;
const A4_H = 842;
const MARGIN = 56;
const CONTENT_W = A4_W - MARGIN * 2;

/* ── HTML helpers ────────────────────────────────────────────────────── */

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function extractBoldSegments(html: string): Set<string> {
  const bolds = new Set<string>();
  const re = /<(?:strong|b)(?:\s[^>]*)?>(.+?)<\/(?:strong|b)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").trim();
    if (text.length > 0) bolds.add(text);
  }
  return bolds;
}

/* ── Parse manuscript ────────────────────────────────────────────────── */

function parseSermonStructure(manuscript: string, title: string, scripture: string): { mainPoints: MainPoint[]; illustrations: string[] } {
  const boldSegments = manuscript.includes("<") ? extractBoldSegments(manuscript) : new Set<string>();
  const raw = manuscript.includes("<") ? stripHtml(manuscript) : manuscript;
  const lines = raw.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  const titleNorm = title.trim().toLowerCase();
  const scriptureNorm = scripture?.trim().toLowerCase() || "";

  const mainPoints: MainPoint[] = [];
  const illustrations: string[] = [];
  let current: MainPoint | null = null;

  for (const line of lines) {
    const lineNorm = line.toLowerCase();
    if (lineNorm === titleNorm || (scriptureNorm && lineNorm === scriptureNorm)) continue;

    const isBoldHeading = [...boldSegments].some(
      b => b.toLowerCase() === lineNorm || lineNorm.startsWith(b.toLowerCase())
    );

    if (isBoldHeading) {
      current = { heading: line, bullets: [] };
      mainPoints.push(current);
    } else if (current) {
      current.bullets.push(line);
    } else {
      illustrations.push(line);
    }
  }

  return { mainPoints, illustrations };
}

/* ── PDF Generation — Portrait A4 Preach Ready ───────────────────────── */

function generatePdf(data: SermonPayload): ArrayBuffer {
  const doc = new jsPDF({ unit: "pt", format: [A4_W, A4_H], orientation: "portrait" });

  const manuscript = data.manuscript || "";
  const title = data.title || "";
  const scripture = data.scriptureReference || data.scripture || "";

  const { mainPoints, illustrations } = parseSermonStructure(manuscript, title, scripture);

  /* ─── PAGE 1: Title + Scripture ─────────────────────────────────── */
  doc.setFont("times", "bold");
  doc.setFontSize(36);
  const titleLines: string[] = doc.splitTextToSize(title, CONTENT_W);
  const titleBlockH = titleLines.length * 44;
  let titleY = (A4_H / 2) - (titleBlockH / 2) - 30;
  if (titleY < MARGIN) titleY = MARGIN;

  for (const line of titleLines) {
    doc.text(line, A4_W / 2, titleY, { align: "center" });
    titleY += 44;
  }

  if (scripture) {
    doc.setFont("times", "italic");
    doc.setFontSize(20);
    const scriptureLines: string[] = doc.splitTextToSize(scripture, CONTENT_W);
    let scriptureY = titleY + 30;
    for (const line of scriptureLines) {
      doc.text(line, A4_W / 2, scriptureY, { align: "center" });
      scriptureY += 26;
    }
  }

  /* ─── PAGE 2: Illustrations & Notes ────────────────────────────── */
  if (illustrations.length > 0) {
    doc.addPage([A4_W, A4_H]);
    let y = MARGIN;

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("ILLUSTRATIONS & NOTES", A4_W / 2, y, { align: "center" });
    y += 36;

    doc.setFont("times", "normal");
    doc.setFontSize(13);
    const lineHeight = 20;

    for (const para of illustrations) {
      const wrapped: string[] = doc.splitTextToSize(para, CONTENT_W);
      for (const line of wrapped) {
        if (y + lineHeight > A4_H - MARGIN) {
          doc.addPage([A4_W, A4_H]);
          y = MARGIN;
        }
        doc.text(line, MARGIN, y);
        y += lineHeight;
      }
      y += 8;
    }
  }

  /* ─── Each Main Point on its own page ──────────────────────────── */
  for (let i = 0; i < mainPoints.length; i++) {
    const mp = mainPoints[i];
    doc.addPage([A4_W, A4_H]);
    let y = MARGIN;

    // Numbered heading in bold
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    const headingText = `${i + 1}. ${mp.heading}`;
    const headingLines: string[] = doc.splitTextToSize(headingText, CONTENT_W - 20);
    for (const hl of headingLines) {
      doc.text(hl, MARGIN + 10, y);
      y += 28;
    }
    y += 12;

    // Bullets in regular font
    doc.setFont("times", "normal");
    doc.setFontSize(14);
    for (const bullet of mp.bullets) {
      const bulletText = `• ${bullet}`;
      const bulletLines: string[] = doc.splitTextToSize(bulletText, CONTENT_W - 40);
      for (const bl of bulletLines) {
        if (y + 20 > A4_H - MARGIN) { doc.addPage([A4_W, A4_H]); y = MARGIN; }
        doc.text(bl, MARGIN + 30, y);
        y += 20;
      }
      y += 6;
    }
  }

  // Copyright on last page
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text(
    `\u00A9 ${new Date().getFullYear()} The Island of One. All rights reserved.`,
    A4_W / 2,
    A4_H - 30,
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
