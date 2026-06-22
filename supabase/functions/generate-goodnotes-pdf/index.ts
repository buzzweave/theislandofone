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
  date?: string;
}

/* ── Types ────────────────────────────────────────────────────────── */

interface ExportMainPoint {
  heading: string;
  bullets: string[];
  keyPoint: string[];
  revelation: string[];
  quotable: string[];
}

interface ExportStructure {
  title: string;
  subtitle: string;
  scriptureReference: string;
  scriptureText: string;
  illustration: string[];
  mainPoints: ExportMainPoint[];
  closing: string[];
}

/* ── A4 + palette ────────────────────────────────────────────────── */

const A4_W = 595;
const A4_H = 842;
const MARGIN = 72; // Generous GoodNotes margins
const CONTENT_W = A4_W - MARGIN * 2;

// GoodNotes spec: white bg, black text, no decorative graphics
const C_BLACK: [number, number, number] = [0, 0, 0];
const C_DARK: [number, number, number] = [20, 20, 20];
const C_MUTED: [number, number, number] = [110, 110, 110];

const CHURCH_NAME = "THE ISLAND OF ONE";
const SPEAKER_NAME = "BRYANT CLARK";

const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X",
  "XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX"];

function toRoman(n: number): string { return ROMAN[n - 1] || String(n); }

function stripNumeralPrefix(s: string): string {
  return s.replace(/^\s*(?:[IVXLCDM]+|\d+)[\.\)]\s+/i, "").trim();
}

function splitTitleSubtitle(full: string): { title: string; subtitle: string } {
  const parts = full.split(/\s*[:\u2014\u2013\-]\s+/);
  if (parts.length >= 2) return { title: parts[0].trim(), subtitle: parts.slice(1).join(" - ").trim() };
  return { title: full.trim(), subtitle: "" };
}

function formatDate(d?: string): string {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }).toUpperCase();
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

/* ── Section / sub-label detection ───────────────────────────────── */

const ILLUSTRATION_RE = /^(?:TRUE\s+)?(?:OPENING\s+)?ILLUSTRATION|^MID[- ]SERMON\s+ILLUSTRATION|^ILLUSTRATION\s*(?:CALLBACK)?/i;
const CLOSING_RE = /^CLOSING(?:\s+(?:BUILD|DECLARATION|THOUGHTS?))?|^ALTAR\s+CALL/i;
const SCRIPTURE_RE = /^SCRIPTURE\s*(?:REFERENCE)?/i;
const INTRO_RE = /^INTRODUCTION/i;
const MAIN_POINT_LABEL_RE = /^MAIN\s+POINT\s+([IVXLCDM0-9]+)/i;

function detectSubLabel(line: string): "keyPoint" | "revelation" | "quotable" | null {
  const t = line.trim().replace(/[:\.]+$/, "").toUpperCase();
  if (t === "KEY POINT" || t === "KEYPOINT") return "keyPoint";
  if (t === "REVELATION") return "revelation";
  if (t === "QUOTABLE") return "quotable";
  return null;
}

function detectSectionType(line: string): "illustration" | "closing" | "scripture" | "intro" | "mainpoint" | null {
  const t = line.trim();
  if (ILLUSTRATION_RE.test(t)) return "illustration";
  if (CLOSING_RE.test(t)) return "closing";
  if (SCRIPTURE_RE.test(t)) return "scripture";
  if (INTRO_RE.test(t)) return "intro";
  if (MAIN_POINT_LABEL_RE.test(t)) return "mainpoint";
  return null;
}

/* ── Parse manuscript ─────────────────────────────────────────────── */

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

    const isSubLabel = detectSubLabel(line) !== null;
    const isBoldHeading = !isSubLabel && [...boldSegments].some(
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

  const ts = splitTitleSubtitle(title);
  const result: ExportStructure = {
    title: ts.title,
    subtitle: ts.subtitle,
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

  const buildMainPoint = (heading: string, allLines: string[]): ExportMainPoint => {
    const bullets: string[] = [];
    const keyPoint: string[] = [];
    const revelation: string[] = [];
    const quotable: string[] = [];
    let bucket: "bullets" | "keyPoint" | "revelation" | "quotable" = "bullets";

    for (const raw of allLines) {
      const line = raw.trim();
      if (!line) continue;
      const sub = detectSubLabel(line);
      if (sub) { bucket = sub; continue; }
      if (bucket === "bullets") bullets.push(line.replace(/^[•●\-*]\s+/, "").trim());
      else if (bucket === "keyPoint") keyPoint.push(line);
      else if (bucket === "revelation") revelation.push(line);
      else if (bucket === "quotable") quotable.push(line.replace(/^[*_]+|[*_]+$/g, "").trim());
    }

    return {
      heading: stripNumeralPrefix(heading),
      bullets: bullets.slice(0, 6),
      keyPoint,
      revelation,
      quotable,
    };
  };

  if (mainPointSections.length > 0) {
    result.mainPoints = mainPointSections.map(mp => buildMainPoint(mp.heading, mp.lines));
  } else {
    const bodyLines = rawSections.filter(s => s.type === "body").flatMap(s => s.lines).filter(l => l.length > 0);
    if (bodyLines.length > 0) {
      const numPoints = Math.min(4, Math.max(1, Math.ceil(bodyLines.length / 7)));
      const chunkSize = Math.ceil(bodyLines.length / numPoints);
      for (let i = 0; i < numPoints; i++) {
        const chunk = bodyLines.slice(i * chunkSize, (i + 1) * chunkSize);
        result.mainPoints.push(buildMainPoint(`MAIN POINT ${toRoman(i + 1)}`, chunk));
      }
    }
  }

  return result;
}

/* ── PDF rendering — GoodNotes locked template ───────────────────── */

function footer(doc: jsPDF, title: string, n: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C_MUTED);
  doc.text(`${title.toUpperCase()} — PAGE ${n}`, A4_W / 2, A4_H - 36, { align: "center" });
}

function generatePdf(data: SermonPayload): ArrayBuffer {
  const doc = new jsPDF({ unit: "pt", format: [A4_W, A4_H], orientation: "portrait" });
  const s = parseExportStructure(
    data.manuscript || "",
    data.title || "",
    data.scriptureReference || data.scripture || "",
  );
  const dateLabel = formatDate(data.date);

  let pageNum = 1;

  /* ── PAGE 1: COVER ────────────────────────────────────────── */
  let y = 240;
  doc.setFont("times", "bold");
  doc.setFontSize(42);
  doc.setTextColor(...C_BLACK);
  const titleLines: string[] = doc.splitTextToSize(s.title.toUpperCase(), CONTENT_W);
  for (const line of titleLines) {
    doc.text(line, A4_W / 2, y, { align: "center" });
    y += 50;
  }
  if (s.subtitle) {
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(18);
    doc.setTextColor(...C_DARK);
    const subLines: string[] = doc.splitTextToSize(s.subtitle, CONTENT_W - 40);
    for (const line of subLines) {
      doc.text(line, A4_W / 2, y, { align: "center" });
      y += 26;
    }
  }
  const cy = A4_H - 210;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...C_BLACK);
  doc.text(CHURCH_NAME, A4_W / 2, cy, { align: "center" });
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.setTextColor(...C_DARK);
  doc.text(SPEAKER_NAME, A4_W / 2, cy + 28, { align: "center" });
  if (dateLabel) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...C_MUTED);
    doc.text(dateLabel, A4_W / 2, cy + 50, { align: "center" });
  }
  footer(doc, s.title, pageNum);

  /* ── PAGE 2: SCRIPTURE ────────────────────────────────────── */
  pageNum++;
  doc.addPage([A4_W, A4_H]);
  let py = 200;
  doc.setFont("times", "bold");
  doc.setFontSize(32);
  doc.setTextColor(...C_BLACK);
  doc.text("SCRIPTURE", A4_W / 2, py, { align: "center" });
  py += 56;
  if (s.scriptureReference) {
    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...C_BLACK);
    const refLines: string[] = doc.splitTextToSize(s.scriptureReference, CONTENT_W);
    for (const line of refLines) {
      doc.text(line, A4_W / 2, py, { align: "center" });
      py += 28;
    }
    py += 16;
  }
  if (s.scriptureText) {
    doc.setFont("times", "normal");
    doc.setFontSize(15);
    doc.setTextColor(...C_DARK);
    const textLines: string[] = doc.splitTextToSize(s.scriptureText, CONTENT_W - 20);
    for (const line of textLines) {
      if (py > A4_H - MARGIN - 60) break;
      doc.text(line, A4_W / 2, py, { align: "center" });
      py += 22;
    }
  }
  footer(doc, s.title, pageNum);

  /* ── PAGE 3: ILLUSTRATION ─────────────────────────────────── */
  if (s.illustration.length > 0) {
    pageNum++;
    doc.addPage([A4_W, A4_H]);
    let iy = MARGIN + 20;
    doc.setFont("times", "bold");
    doc.setFontSize(30);
    doc.setTextColor(...C_BLACK);
    doc.text("ILLUSTRATION", A4_W / 2, iy, { align: "center" });
    iy += 56;
    doc.setFont("times", "normal");
    doc.setFontSize(14);
    doc.setTextColor(...C_DARK);
    for (const para of s.illustration) {
      const lines: string[] = doc.splitTextToSize(para, CONTENT_W - 10);
      for (const line of lines) {
        if (iy > A4_H - MARGIN - 60) break;
        doc.text(line, MARGIN + 5, iy);
        iy += 22;
      }
      if (iy > A4_H - MARGIN - 60) break;
      iy += 8;
    }
    footer(doc, s.title, pageNum);
  }

  /* ── MAIN POINTS ──────────────────────────────────────────── */
  s.mainPoints.forEach((mp, idx) => {
    pageNum++;
    doc.addPage([A4_W, A4_H]);
    pageNum = renderMainPointPage(doc, mp, idx + 1, pageNum, s.title);
  });

  /* ── ALTAR CALL ───────────────────────────────────────────── */
  if (s.closing.length > 0) {
    pageNum++;
    doc.addPage([A4_W, A4_H]);
    let ay = MARGIN + 20;
    doc.setFont("times", "bold");
    doc.setFontSize(30);
    doc.setTextColor(...C_BLACK);
    doc.text("ALTAR CALL", A4_W / 2, ay, { align: "center" });
    ay += 56;
    doc.setFont("times", "normal");
    doc.setFontSize(14);
    doc.setTextColor(...C_DARK);
    for (const para of s.closing) {
      const lines: string[] = doc.splitTextToSize(para, CONTENT_W - 10);
      for (const line of lines) {
        if (ay > A4_H - MARGIN - 60) {
          footer(doc, s.title, pageNum);
          pageNum++;
          doc.addPage([A4_W, A4_H]);
          ay = MARGIN + 20;
          doc.setFont("times", "normal");
          doc.setFontSize(14);
          doc.setTextColor(...C_DARK);
        }
        doc.text(line, MARGIN + 5, ay);
        ay += 22;
      }
      ay += 8;
    }
    footer(doc, s.title, pageNum);
  }

  // Copyright on last page
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...C_MUTED);
  doc.text(
    `\u00A9 ${new Date().getFullYear()} The Island of One. All rights reserved.`,
    A4_W / 2, A4_H - 22, { align: "center" },
  );

  return doc.output("arraybuffer");
}

function renderMainPointPage(
  doc: jsPDF,
  mp: ExportMainPoint,
  index: number,
  pageNum: number,
  title: string,
): number {
  let y = MARGIN + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C_MUTED);
  doc.text(`MAIN POINT ${toRoman(index)}`, A4_W / 2, y, { align: "center" });
  y += 40;

  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...C_BLACK);
  const headingLines: string[] = doc.splitTextToSize(mp.heading.toUpperCase(), CONTENT_W);
  for (const hl of headingLines) {
    doc.text(hl, A4_W / 2, y, { align: "center" });
    y += 30;
  }
  y += 18;

  const ensure = (needed: number) => {
    if (y + needed > A4_H - MARGIN - 50) {
      footer(doc, title, pageNum);
      pageNum++;
      doc.addPage([A4_W, A4_H]);
      y = MARGIN + 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...C_MUTED);
      doc.text(`MAIN POINT ${toRoman(index)} (cont.)`, A4_W / 2, y, { align: "center" });
      y += 40;
    }
  };

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...C_DARK);
  for (const bullet of mp.bullets) {
    if (!bullet) continue;
    const bulletLines: string[] = doc.splitTextToSize(bullet, CONTENT_W - 30);
    let first = true;
    for (const bl of bulletLines) {
      ensure(22);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(13);
      doc.setTextColor(...C_DARK);
      if (first) { doc.text("•", MARGIN + 8, y); doc.text(bl, MARGIN + 26, y); first = false; }
      else { doc.text(bl, MARGIN + 26, y); }
      y += 20;
    }
    y += 6;
  }

  const renderSection = (label: string, paras: string[], italic = false) => {
    if (!paras.length) return;
    ensure(60);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...C_BLACK);
    doc.text(label, MARGIN, y);
    y += 20;
    for (const para of paras) {
      const lines: string[] = doc.splitTextToSize(para, CONTENT_W - 10);
      for (const line of lines) {
        ensure(22);
        doc.setFont("times", italic ? "italic" : "normal");
        doc.setFontSize(13);
        doc.setTextColor(...C_DARK);
        doc.text(line, MARGIN + 6, y);
        y += 20;
      }
      y += 4;
    }
  };

  renderSection("KEY POINT", mp.keyPoint);
  renderSection("REVELATION", mp.revelation);
  if (mp.quotable.length) renderSection("QUOTABLE", mp.quotable, true);

  footer(doc, title, pageNum);
  return pageNum;
}


/* ── Handler ─────────────────────────────────────────────────────── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
    if (!token || token === anonKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userResp = await fetch(`${sbUrl}/auth/v1/user`, {
      headers: { apikey: sbKey, Authorization: `Bearer ${token}` },
    });
    if (!userResp.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
