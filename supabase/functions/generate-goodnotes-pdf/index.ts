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

/* ── Types ────────────────────────────────────────────────────────── */

interface ExportMainPoint {
  heading: string;
  summary: string;
  bullets: string[];
}

interface ExportStructure {
  title: string;
  scriptureReference: string;
  scriptureText: string;
  illustration: string[];
  mainPoints: ExportMainPoint[];
  closing: string[];
}

/* ── Portrait A4 ─────────────────────────────────────────────────── */

const A4_W = 595;
const A4_H = 842;
const MARGIN = 56;
const CONTENT_W = A4_W - MARGIN * 2;

/* ── Roman numerals ──────────────────────────────────────────────── */

const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X",
  "XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX"];

function toRoman(n: number): string {
  return ROMAN[n - 1] || String(n);
}

/* ── HTML helpers ────────────────────────────────────────────────── */

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
    const text = m[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
      .trim();
    if (text.length > 0) bolds.add(text);
  }
  return bolds;
}

/* ── Section label detection ─────────────────────────────────────── */

const ILLUSTRATION_RE = /^(?:TRUE\s+)?(?:OPENING\s+)?ILLUSTRATION|^MID[- ]SERMON\s+ILLUSTRATION|^ILLUSTRATION\s*(?:CALLBACK)?/i;
const CLOSING_RE = /^CLOSING(?:\s+(?:BUILD|DECLARATION|THOUGHTS?))?|^ALTAR\s+CALL/i;
const SCRIPTURE_RE = /^SCRIPTURE\s*(?:REFERENCE)?/i;
const INTRO_RE = /^INTRODUCTION/i;
const MAIN_POINT_LABEL_RE = /^MAIN\s+POINT\s+([IVXLCDM0-9]+)/i;

function detectSectionType(line: string): "illustration" | "closing" | "scripture" | "intro" | "mainpoint" | null {
  const t = line.trim();
  if (ILLUSTRATION_RE.test(t)) return "illustration";
  if (CLOSING_RE.test(t)) return "closing";
  if (SCRIPTURE_RE.test(t)) return "scripture";
  if (INTRO_RE.test(t)) return "intro";
  if (MAIN_POINT_LABEL_RE.test(t)) return "mainpoint";
  return null;
}

/* ── Ensure exactly 6 bullets ────────────────────────────────────── */

function ensureSixBullets(source: string[]): string[] {
  const cleaned = source.map(l => l.replace(/^[•●\-*]\s+/, "").trim()).filter(l => l.length > 0);
  if (cleaned.length >= 6) return cleaned.slice(0, 6);

  const expanded: string[] = [];
  for (const line of cleaned) {
    if (expanded.length >= 6) break;
    const sentences = line.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 1 && expanded.length + sentences.length <= 8) {
      for (const s of sentences) {
        if (expanded.length >= 6) break;
        expanded.push(s.trim());
      }
    } else {
      expanded.push(line);
    }
  }
  while (expanded.length < 6) expanded.push("");
  return expanded.slice(0, 6);
}

/* ── Parse manuscript into export structure ───────────────────────── */

function parseExportStructure(manuscript: string, title: string, scriptureReference: string): ExportStructure {
  const boldSegments = manuscript.includes("<") ? extractBoldSegments(manuscript) : new Set<string>();
  const raw = manuscript.includes("<") ? stripHtml(manuscript) : manuscript;
  const lines = raw.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  const titleNorm = title.trim().toLowerCase();
  const scriptureNorm = scriptureReference?.trim().toLowerCase() || "";

  interface RawSection {
    type: "illustration" | "closing" | "scripture" | "intro" | "mainpoint" | "body";
    heading: string;
    lines: string[];
  }

  const rawSections: RawSection[] = [];
  let current: RawSection | null = null;

  for (const line of lines) {
    const lineNorm = line.toLowerCase();
    if (lineNorm === titleNorm || (scriptureNorm && lineNorm === scriptureNorm)) continue;

    const sectionType = detectSectionType(line);
    if (sectionType) {
      current = { type: sectionType, heading: line, lines: [] };
      rawSections.push(current);
      continue;
    }

    const isBoldHeading = [...boldSegments].some(
      b => b.toLowerCase() === lineNorm || lineNorm.startsWith(b.toLowerCase())
    );

    if (isBoldHeading && line.length < 120) {
      current = { type: "mainpoint", heading: line, lines: [] };
      rawSections.push(current);
      continue;
    }

    if (current) {
      current.lines.push(line);
    } else {
      if (!rawSections.length || rawSections[rawSections.length - 1].type !== "body") {
        current = { type: "body", heading: "", lines: [line] };
        rawSections.push(current);
      } else {
        rawSections[rawSections.length - 1].lines.push(line);
        current = rawSections[rawSections.length - 1];
      }
    }
  }

  const result: ExportStructure = {
    title,
    scriptureReference,
    scriptureText: "",
    illustration: [],
    mainPoints: [],
    closing: [],
  };

  const scriptureSections = rawSections.filter(s => s.type === "scripture");
  if (scriptureSections.length > 0) {
    result.scriptureText = scriptureSections.flatMap(s => s.lines).join("\n\n");
  }

  const illustrationSections = rawSections.filter(s => s.type === "illustration" || s.type === "intro" || s.type === "body");
  result.illustration = illustrationSections.flatMap(s => s.lines).filter(l => l.length > 0);

  const closingSections = rawSections.filter(s => s.type === "closing");
  result.closing = closingSections.flatMap(s => s.lines).filter(l => l.length > 0);

  const mainPointSections = rawSections.filter(s => s.type === "mainpoint");

  if (mainPointSections.length > 0) {
    result.mainPoints = mainPointSections.map((mp, idx) => {
      const allLines = mp.lines;
      const summary = allLines[0] || mp.heading;
      const bulletSource = allLines.slice(summary === mp.heading ? 0 : 1);
      return {
        heading: `MAIN POINT ${toRoman(idx + 1)}`,
        summary: summary === mp.heading ? "" : summary,
        bullets: ensureSixBullets(bulletSource),
      };
    });
  } else {
    const bodyLines = rawSections.filter(s => s.type === "body").flatMap(s => s.lines).filter(l => l.length > 0);
    if (bodyLines.length > 0) {
      const numPoints = Math.min(4, Math.max(1, Math.ceil(bodyLines.length / 7)));
      const chunkSize = Math.ceil(bodyLines.length / numPoints);
      for (let i = 0; i < numPoints; i++) {
        const chunk = bodyLines.slice(i * chunkSize, (i + 1) * chunkSize);
        const summary = chunk[0] || "";
        const bulletSource = chunk.slice(1);
        result.mainPoints.push({
          heading: `MAIN POINT ${toRoman(i + 1)}`,
          summary,
          bullets: ensureSixBullets(bulletSource),
        });
      }
    }
  }

  return result;
}

/* ── PDF Generation — Section-per-page Pulpit Format ─────────────── */

function generatePdf(data: SermonPayload): ArrayBuffer {
  const doc = new jsPDF({ unit: "pt", format: [A4_W, A4_H], orientation: "portrait" });

  const s = parseExportStructure(
    data.manuscript || "",
    data.title || "",
    data.scriptureReference || data.scripture || "",
  );

  let y: number;

  // ─── PAGE 1: Title Only ──────────────────────────────────────
  doc.setFont("times", "bold");
  doc.setFontSize(52);
  const titleLines: string[] = doc.splitTextToSize(s.title, CONTENT_W);
  const titleBlockH = titleLines.length * 62;
  y = (A4_H / 2) - (titleBlockH / 2);
  if (y < MARGIN) y = MARGIN;
  for (const line of titleLines) {
    doc.text(line, A4_W / 2, y, { align: "center" });
    y += 62;
  }

  // ─── PAGE 2: Scripture ───────────────────────────────────────
  if (s.scriptureReference || s.scriptureText) {
    doc.addPage([A4_W, A4_H]);
    y = MARGIN;

    doc.setFont("times", "bold");
    doc.setFontSize(34);
    doc.text("SCRIPTURE", A4_W / 2, y, { align: "center" });
    y += 44;

    if (s.scriptureReference) {
      doc.setFont("times", "italic");
      doc.setFontSize(22);
      const refLines: string[] = doc.splitTextToSize(s.scriptureReference, CONTENT_W);
      for (const line of refLines) {
        doc.text(line, A4_W / 2, y, { align: "center" });
        y += 30;
      }
      y += 16;
    }

    if (s.scriptureText) {
      doc.setFont("times", "normal");
      doc.setFontSize(20);
      const textLines: string[] = doc.splitTextToSize(s.scriptureText, CONTENT_W);
      for (const line of textLines) {
        if (y + 28 > A4_H - MARGIN) { doc.addPage([A4_W, A4_H]); y = MARGIN; }
        doc.text(line, MARGIN, y);
        y += 28;
      }
    }
  }

  // ─── Illustration Page ───────────────────────────────────────
  if (s.illustration.length > 0) {
    doc.addPage([A4_W, A4_H]);
    y = MARGIN;

    doc.setFont("times", "bold");
    doc.setFontSize(34);
    doc.text("ILLUSTRATION", A4_W / 2, y, { align: "center" });
    y += 44;

    doc.setFont("times", "normal");
    doc.setFontSize(18);
    for (const para of s.illustration) {
      const wrapped: string[] = doc.splitTextToSize(para, CONTENT_W);
      for (const line of wrapped) {
        if (y + 28 > A4_H - MARGIN) { doc.addPage([A4_W, A4_H]); y = MARGIN; }
        doc.text(line, MARGIN, y);
        y += 28;
      }
      y += 16;
    }
  }

  // ─── MAIN POINTS — each on its own page ──────────────────────
  for (const mp of s.mainPoints) {
    doc.addPage([A4_W, A4_H]);
    y = MARGIN;

    // Heading
    doc.setFont("times", "bold");
    doc.setFontSize(32);
    const headingLines: string[] = doc.splitTextToSize(mp.heading, CONTENT_W);
    for (const hl of headingLines) {
      doc.text(hl, MARGIN, y);
      y += 40;
    }
    y += 8;

    // Summary paragraph
    if (mp.summary) {
      doc.setFont("times", "normal");
      doc.setFontSize(19);
      const summaryLines: string[] = doc.splitTextToSize(mp.summary, CONTENT_W);
      for (const sl of summaryLines) {
        doc.text(sl, MARGIN, y);
        y += 28;
      }
      y += 16;
    }

    // 6 bullet points
    doc.setFont("times", "normal");
    doc.setFontSize(18);
    for (const bullet of mp.bullets) {
      if (!bullet) continue;
      const bulletText = `•  ${bullet}`;
      const bulletLines: string[] = doc.splitTextToSize(bulletText, CONTENT_W - 30);
      for (const bl of bulletLines) {
        doc.text(bl, MARGIN + 20, y);
        y += 28;
      }
      y += 14;
    }
  }

  // ─── Closing Page ────────────────────────────────────────────
  if (s.closing.length > 0) {
    doc.addPage([A4_W, A4_H]);
    y = MARGIN;

    doc.setFont("times", "bold");
    doc.setFontSize(34);
    doc.text("CLOSING", A4_W / 2, y, { align: "center" });
    y += 44;

    doc.setFont("times", "normal");
    doc.setFontSize(14);
    for (const para of s.closing) {
      const wrapped: string[] = doc.splitTextToSize(para, CONTENT_W);
      for (const line of wrapped) {
        if (y + 22 > A4_H - MARGIN) { doc.addPage([A4_W, A4_H]); y = MARGIN; }
        doc.text(line, MARGIN, y);
        y += 22;
      }
      y += 12;
    }
  }

  // Copyright
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

/* ── Handler ─────────────────────────────────────────────────────── */

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
