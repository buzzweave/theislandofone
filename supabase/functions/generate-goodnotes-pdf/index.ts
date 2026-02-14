import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Types ────────────────────────────────────────────────────────────── */

interface PulpitSection {
  heading: string;
  bullets: string[];
}

interface SermonPayload {
  title: string;
  scriptureReference?: string;
  scriptureText?: string;
  mainPoints?: { heading: string; bullets: string[] }[];
  scripture?: string;
  manuscript?: string;
}

/* ── Constants ────────────────────────────────────────────────────────── */

const A4_W = 595;
const A4_H = 842;
const MARGIN = 72;
const CONTENT_W = A4_W - MARGIN * 2;
const MAX_BULLETS = 6;
const MIN_BULLETS = 5;

const FONT = {
  title: 44,
  scriptureHeader: 24,
  scriptureText: 18,
  mainPoint: 28,
  bullet: 16,
  copyright: 9,
};

/* ── Helpers ──────────────────────────────────────────────────────────── */

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

const ROMAN = /^(I{1,3}|IV|V|VI{0,3}|IX|X{1,3}|XL|L)[\.\)\s\u2014\u2013\-:]/i;
const MAIN_POINT_KW = /main\s*point/i;

function isHeading(line: string): boolean {
  const t = line.trim();
  if (t.length === 0 || t.length > 150) return false;
  if (MAIN_POINT_KW.test(t)) return true;
  if (ROMAN.test(t)) return true;
  if (/^\d{1,2}[\.\)\s\u2014\u2013\-:]/.test(t) && t === t.toUpperCase()) return true;
  if (t === t.toUpperCase() && t.length > 3 && t.length < 150) return true;
  if (t.endsWith(":") && t.length < 100) return true;
  return false;
}

function splitLongBullet(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g);
  if (!sentences || sentences.length <= 2) return [text.trim()];
  const result: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    const chunk = (sentences[i] + (sentences[i + 1] || "")).trim();
    if (chunk) result.push(chunk);
  }
  return result;
}

function parseManuscript(raw: string): PulpitSection[] {
  const text = raw.includes("<") ? stripHtml(raw) : raw;
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const sections: PulpitSection[] = [];
  let current: PulpitSection | null = null;

  for (const line of lines) {
    if (isHeading(line)) {
      current = { heading: line, bullets: [] };
      sections.push(current);
    } else if (current) {
      const split = splitLongBullet(line);
      current.bullets.push(...split);
    } else {
      current = { heading: "", bullets: [line] };
      sections.push(current);
    }
  }
  return sections;
}

interface PageSlice {
  heading: string;
  bullets: string[];
}

function layoutPages(sections: PulpitSection[]): PageSlice[] {
  const pages: PageSlice[] = [];
  for (const section of sections) {
    const { heading, bullets } = section;
    if (bullets.length <= MAX_BULLETS) {
      pages.push({ heading, bullets: [...bullets] });
    } else {
      let remaining = [...bullets];
      let first = true;
      while (remaining.length > 0) {
        let take = Math.min(MAX_BULLETS, remaining.length);
        const leftover = remaining.length - take;
        if (leftover > 0 && leftover < 2) take = remaining.length - 2;
        if (take < MIN_BULLETS && remaining.length > take) take = MIN_BULLETS;
        pages.push({ heading: first ? heading : "", bullets: remaining.slice(0, take) });
        remaining = remaining.slice(take);
        first = false;
      }
    }
  }
  return pages;
}

/* ── PDF Generation — GOODNOTES PULPIT FORMAT ────────────────────────── */

function generatePdf(data: SermonPayload): ArrayBuffer {
  const doc = new jsPDF({ unit: "pt", format: "a4" }); // 595 × 842 portrait
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = MARGIN;

  const newPage = () => { doc.addPage(); y = MARGIN; };
  const checkPage = (needed: number) => { if (y + needed > pageH - MARGIN) newPage(); };

  // ── PAGE 1: Title Page ──────────────────────────────────────────────

  // Title — 44pt bold centered
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.title);
  const titleLines: string[] = doc.splitTextToSize(data.title, CONTENT_W);
  const titleBlockH = titleLines.length * 52;
  const titleY = Math.max(MARGIN, (pageH - titleBlockH) * 0.35);
  y = titleY;
  doc.text(titleLines, pageW / 2, y, { align: "center" });
  y += titleBlockH + 30;

  // Scripture reference — 24pt bold uppercase
  const ref = data.scriptureReference || data.scripture || "";
  if (ref) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FONT.scriptureHeader);
    const refLines: string[] = doc.splitTextToSize(ref.toUpperCase(), CONTENT_W - 40);
    doc.text(refLines, pageW / 2, y, { align: "center" });
    y += refLines.length * 32 + 16;
  }

  // Scripture text — 18pt normal
  const scrText = data.scriptureText || "";
  if (scrText) {
    doc.setFont("times", "normal");
    doc.setFontSize(FONT.scriptureText);
    const sLines: string[] = doc.splitTextToSize(scrText, CONTENT_W - 20);
    for (const line of sLines) {
      checkPage(26);
      doc.text(line, pageW / 2, y, { align: "center" });
      y += 26;
    }
    y += 20;
  }

  // Author
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text("By Bryant Clark", pageW / 2, Math.min(y + 20, pageH * 0.65), { align: "center" });

  // Copyright on title page
  doc.setFont("helvetica", "italic");
  doc.setFontSize(FONT.copyright);
  doc.text(
    `\u00A9 ${new Date().getFullYear()} The Island of One. All rights reserved.`,
    pageW / 2,
    pageH - 40,
    { align: "center" },
  );

  // ── MAIN POINT PAGES ───────────────────────────────────────────────

  const rawSections =
    data.mainPoints && data.mainPoints.length > 0
      ? data.mainPoints
      : data.manuscript
        ? parseManuscript(data.manuscript)
        : [];

  // Remove sections whose heading duplicates the sermon title (already on page 1)
  const titleUpper = data.title.trim().toUpperCase();
  const sections: PulpitSection[] = [];
  for (const s of rawSections) {
    if (s.heading && s.heading.trim().toUpperCase() === titleUpper) {
      // Prepend orphaned bullets to the next section so no content is lost
      if (s.bullets.length > 0) {
        const next = rawSections[rawSections.indexOf(s) + 1];
        if (next) {
          next.bullets = [...s.bullets, ...next.bullets];
        }
      }
      continue;
    }
    sections.push(s);
  }

  // Cleanup: merge empty sections (orphan headers) into neighbors
  const cleaned: PulpitSection[] = [];
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (s.bullets.length === 0 && s.heading) {
      const next = sections[i + 1];
      if (next) {
        next.bullets = [s.heading, ...next.bullets];
      } else if (cleaned.length > 0) {
        cleaned[cleaned.length - 1].bullets.push(s.heading);
      }
      continue;
    }
    cleaned.push(s);
  }

  const pages = layoutPages(cleaned);

  for (const page of pages) {
    newPage();

    // Heading — 28pt bold uppercase left-aligned, NO bullet
    if (page.heading) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(FONT.mainPoint);
      const hLines: string[] = doc.splitTextToSize(page.heading.toUpperCase(), CONTENT_W);
      for (const hl of hLines) {
        doc.text(hl, MARGIN, y);
        y += 36;
      }
      y += 16; // gap after heading
    }

    // Bullets — 16pt with round bullet, generous spacing
    const bulletCount = page.bullets.length;
    // Calculate spacing to fill page evenly
    const availableH = pageH - MARGIN - y;
    const baseLineH = 24;
    const dynamicGap = Math.max(baseLineH, Math.min(availableH / Math.max(bulletCount, 1), 48));

    for (const bullet of page.bullets) {
      doc.setFont("times", "normal");
      doc.setFontSize(FONT.bullet);
      const bLines: string[] = doc.splitTextToSize(bullet, CONTENT_W - 24);

      for (let i = 0; i < bLines.length; i++) {
        checkPage(24);
        if (i === 0) {
          doc.text("\u2022", MARGIN + 4, y);
          doc.text(bLines[i], MARGIN + 24, y);
        } else {
          doc.text(bLines[i], MARGIN + 24, y);
        }
        y += baseLineH;
      }
      y += dynamicGap - baseLineH; // extra gap between bullets
    }
  }

  // Final copyright on last page
  const lastPageH = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "italic");
  doc.setFontSize(FONT.copyright);
  doc.text(
    `\u00A9 ${new Date().getFullYear()} The Island of One. All rights reserved. For personal use only.`,
    pageW / 2,
    lastPageH - 40,
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
