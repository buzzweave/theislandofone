import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MainPoint {
  heading: string;
  bullets: string[];
}

interface SermonPayload {
  title: string;
  scriptureReference?: string;
  scriptureText?: string;
  mainPoints?: MainPoint[];
  // fallback: existing Sermon shape
  scripture?: string;
  manuscript?: string;
}

/* ── helpers ─────────────────────────────────────────────────────────── */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** Parse flat manuscript text into structured main points */
function parseManuscript(raw: string): MainPoint[] {
  const text = raw.includes("<") ? stripHtml(raw) : raw;
  const lines = text.split("\n").filter((l) => l.trim());
  const points: MainPoint[] = [];
  let current: MainPoint | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    // Heuristic: lines that are short, all-caps or end with colon → heading
    const isHeading =
      trimmed.length < 120 &&
      (trimmed === trimmed.toUpperCase() ||
        trimmed.endsWith(":") ||
        /^\d+[\.\)]\s/.test(trimmed));

    if (isHeading) {
      current = { heading: trimmed, bullets: [] };
      points.push(current);
    } else if (current) {
      current.bullets.push(trimmed);
    } else {
      // No heading yet – create one
      current = { heading: "", bullets: [trimmed] };
      points.push(current);
    }
  }
  return points;
}

/* ── PDF generation ──────────────────────────────────────────────────── */

function generatePdf(data: SermonPayload): ArrayBuffer {
  const doc = new jsPDF({ unit: "pt", format: "letter" }); // 612 × 792
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 72; // 1 inch
  const contentW = pageW - margin * 2;
  let y = margin;

  const checkPage = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ── Title ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  const titleLines: string[] = doc.splitTextToSize(data.title, contentW);
  checkPage(titleLines.length * 48);
  doc.text(titleLines, pageW / 2, y, { align: "center" });
  y += titleLines.length * 48 + 30;

  // ── SCRIPTURE ──
  const ref = data.scriptureReference || data.scripture || "";
  const scrText = data.scriptureText || "";

  if (ref || scrText) {
    checkPage(60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("SCRIPTURE", margin, y);
    y += 32;

    if (ref) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(18);
      const refLines: string[] = doc.splitTextToSize(ref, contentW);
      checkPage(refLines.length * 24);
      doc.text(refLines, margin, y);
      y += refLines.length * 24 + 10;
    }

    if (scrText) {
      doc.setFont("times", "normal");
      doc.setFontSize(16);
      const sLines: string[] = doc.splitTextToSize(scrText, contentW);
      for (const line of sLines) {
        checkPage(22);
        doc.text(line, margin, y);
        y += 22;
      }
      y += 16;
    }
  }

  // ── MAIN POINTS ──
  const points =
    data.mainPoints && data.mainPoints.length > 0
      ? data.mainPoints
      : data.manuscript
        ? parseManuscript(data.manuscript)
        : [];

  if (points.length > 0) {
    checkPage(50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("MAIN POINTS", margin, y);
    y += 36;

    for (const pt of points) {
      if (pt.heading) {
        checkPage(34);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        const hLines: string[] = doc.splitTextToSize(pt.heading, contentW);
        for (const hl of hLines) {
          checkPage(28);
          doc.text(hl, margin, y);
          y += 28;
        }
        y += 8;
      }

      for (const bullet of pt.bullets) {
        doc.setFont("times", "normal");
        doc.setFontSize(16);
        const bLines: string[] = doc.splitTextToSize(bullet, contentW - 20);
        for (let i = 0; i < bLines.length; i++) {
          checkPage(22);
          if (i === 0) {
            doc.text("\u2022", margin + 4, y);
            doc.text(bLines[i], margin + 20, y);
          } else {
            doc.text(bLines[i], margin + 20, y);
          }
          y += 22;
        }
        y += 6;
      }
      y += 14;
    }
  }

  // ── Footer ──
  checkPage(40);
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
    const slug = slugify(data.title);
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
