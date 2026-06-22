import { jsPDF } from "jspdf";
import { buildEpubZip } from "@/lib/bookExport";
import { triggerDownload } from "@/lib/downloadHelper";
import { COPYRIGHT } from "@/lib/pulpitFormat";
import { parseExportStructure, toRoman, type ExportStructure, type ExportMainPoint } from "@/lib/sermonExportFormatter";
import type { Sermon } from "@/hooks/useSermons";

const safeTitle = (title: string) => title.replace(/[^a-zA-Z0-9]/g, "_");

// ── Shared helpers ──────────────────────────────────────────────────

function normalizeParagraphs(html: string): string {
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

function escapeXml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── A4 + brand palette ─────────────────────────────────────────────

const A4W = 595;
const A4H = 842;
const MARGIN = 64;
const CONTENT_W = A4W - MARGIN * 2;

const COLOR_BURGUNDY: [number, number, number] = [139, 26, 43];
const COLOR_GOLD: [number, number, number] = [201, 162, 74];
const COLOR_SUBTITLE: [number, number, number] = [40, 50, 70];
const COLOR_BODY: [number, number, number] = [25, 25, 25];
const COLOR_FOOTER: [number, number, number] = [150, 150, 150];

const CHURCH_NAME = "THE ISLAND OF ONE";
const SPEAKER_NAME = "BRYANT CLARK";

function formatSermonDate(d?: string): string {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }).toUpperCase();
}

// ─── PDF page chrome ────────────────────────────────────────────────

function drawTopRule(doc: jsPDF) {
  doc.setDrawColor(...COLOR_GOLD);
  doc.setLineWidth(1.1);
  doc.line(MARGIN, MARGIN - 26, A4W - MARGIN, MARGIN - 26);
}

function drawFooter(doc: jsPDF, title: string, pageNum: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_FOOTER);
  doc.text(`${title.toUpperCase()} — PAGE ${pageNum}`, A4W / 2, A4H - 30, { align: "center" });
}

function newPage(doc: jsPDF) {
  doc.addPage([A4W, A4H]);
  drawTopRule(doc);
}

// ─── PDF Export — Locked Pulpit Format ──────────────────────────────

export function exportSermonToPdf(sermon: Sermon) {
  const doc = new jsPDF({ unit: "pt", format: [A4W, A4H], orientation: "portrait" });

  const structure = parseExportStructure(
    sermon.manuscript || "",
    sermon.title || "",
    sermon.scripture || "",
  );

  renderPdfFromStructure(doc, structure, formatSermonDate(sermon.date));

  const pdfBlob = doc.output("blob");
  triggerDownload(pdfBlob, `${safeTitle(sermon.title)}_Print.pdf`);
}

function renderPdfFromStructure(doc: jsPDF, s: ExportStructure, dateLabel: string) {
  let pageNum = 1;

  // ─── PAGE 1: COVER ─────────────────────────────────────────────
  drawTopRule(doc);

  let y = 220;
  doc.setFont("times", "bold");
  doc.setFontSize(42);
  doc.setTextColor(...COLOR_BURGUNDY);
  const titleLines: string[] = doc.splitTextToSize(s.title.toUpperCase(), CONTENT_W);
  for (const line of titleLines) {
    doc.text(line, A4W / 2, y, { align: "center" });
    y += 50;
  }

  if (s.subtitle) {
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(18);
    doc.setTextColor(...COLOR_SUBTITLE);
    const subLines: string[] = doc.splitTextToSize(s.subtitle, CONTENT_W - 60);
    for (const line of subLines) {
      doc.text(line, A4W / 2, y, { align: "center" });
      y += 26;
    }
  }

  const cy = A4H - 200;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLOR_GOLD);
  doc.text(CHURCH_NAME, A4W / 2, cy, { align: "center" });

  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.setTextColor(...COLOR_BODY);
  doc.text(SPEAKER_NAME, A4W / 2, cy + 26, { align: "center" });

  if (dateLabel) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...COLOR_FOOTER);
    doc.text(dateLabel, A4W / 2, cy + 48, { align: "center" });
  }
  drawFooter(doc, s.title, pageNum);

  // ─── PAGE 2: SCRIPTURE ─────────────────────────────────────────
  pageNum++;
  newPage(doc);
  let py = 180;
  doc.setFont("times", "bold");
  doc.setFontSize(32);
  doc.setTextColor(...COLOR_BURGUNDY);
  doc.text("SCRIPTURE", A4W / 2, py, { align: "center" });
  py += 50;

  if (s.scriptureReference) {
    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...COLOR_BODY);
    const refLines: string[] = doc.splitTextToSize(s.scriptureReference, CONTENT_W);
    for (const line of refLines) {
      doc.text(line, A4W / 2, py, { align: "center" });
      py += 28;
    }
    py += 16;
  }

  if (s.scriptureText) {
    doc.setFont("times", "normal");
    doc.setFontSize(15);
    doc.setTextColor(...COLOR_BODY);
    const textLines: string[] = doc.splitTextToSize(s.scriptureText, CONTENT_W - 30);
    for (const line of textLines) {
      if (py > A4H - MARGIN - 60) break;
      doc.text(line, A4W / 2, py, { align: "center" });
      py += 22;
    }
  }
  drawFooter(doc, s.title, pageNum);

  // ─── PAGE 3: ILLUSTRATION ─────────────────────────────────────
  if (s.illustration.length > 0) {
    pageNum++;
    newPage(doc);
    let iy = MARGIN + 10;
    doc.setFont("times", "bold");
    doc.setFontSize(30);
    doc.setTextColor(...COLOR_BURGUNDY);
    doc.text("ILLUSTRATION", A4W / 2, iy, { align: "center" });
    iy += 48;

    doc.setFont("times", "normal");
    doc.setFontSize(14);
    doc.setTextColor(...COLOR_BODY);
    for (const para of s.illustration) {
      const lines: string[] = doc.splitTextToSize(para, CONTENT_W - 10);
      for (const line of lines) {
        if (iy > A4H - MARGIN - 60) break;
        doc.text(line, MARGIN + 5, iy);
        iy += 21;
      }
      if (iy > A4H - MARGIN - 60) break;
      iy += 6;
    }
    drawFooter(doc, s.title, pageNum);
  }

  // ─── MAIN POINTS ──────────────────────────────────────────────
  s.mainPoints.forEach((mp, idx) => {
    pageNum++;
    newPage(doc);
    pageNum = renderMainPointPage(doc, mp, idx + 1, pageNum, s.title);
  });

  // ─── ALTAR CALL ───────────────────────────────────────────────
  if (s.closing.length > 0) {
    pageNum++;
    newPage(doc);
    let cy2 = MARGIN + 10;
    doc.setFont("times", "bold");
    doc.setFontSize(30);
    doc.setTextColor(...COLOR_BURGUNDY);
    doc.text("ALTAR CALL", A4W / 2, cy2, { align: "center" });
    cy2 += 48;

    doc.setFont("times", "normal");
    doc.setFontSize(14);
    doc.setTextColor(...COLOR_BODY);
    for (const para of s.closing) {
      const lines: string[] = doc.splitTextToSize(para, CONTENT_W - 10);
      for (const line of lines) {
        if (cy2 > A4H - MARGIN - 60) {
          drawFooter(doc, s.title, pageNum);
          pageNum++;
          newPage(doc);
          cy2 = MARGIN + 10;
          doc.setFont("times", "normal");
          doc.setFontSize(14);
          doc.setTextColor(...COLOR_BODY);
        }
        doc.text(line, MARGIN + 5, cy2);
        cy2 += 21;
      }
      cy2 += 8;
    }
    drawFooter(doc, s.title, pageNum);
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_FOOTER);
  doc.text(COPYRIGHT(), A4W / 2, A4H - 16, { align: "center" });
}

function renderMainPointPage(
  doc: jsPDF,
  mp: ExportMainPoint,
  index: number,
  pageNum: number,
  title: string,
): number {
  let y = MARGIN + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_GOLD);
  doc.text(`MAIN POINT ${toRoman(index)}`, A4W / 2, y, { align: "center" });
  y += 38;

  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...COLOR_BURGUNDY);
  const headingLines: string[] = doc.splitTextToSize(mp.heading.toUpperCase(), CONTENT_W);
  for (const hl of headingLines) {
    doc.text(hl, A4W / 2, y, { align: "center" });
    y += 30;
  }
  y += 16;

  const ensurePageRoom = (needed: number) => {
    if (y + needed > A4H - MARGIN - 50) {
      drawFooter(doc, title, pageNum);
      pageNum++;
      doc.addPage([A4W, A4H]);
      drawTopRule(doc);
      y = MARGIN + 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...COLOR_GOLD);
      doc.text(`MAIN POINT ${toRoman(index)} (cont.)`, A4W / 2, y, { align: "center" });
      y += 38;
    }
  };

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...COLOR_BODY);
  for (const bullet of mp.bullets) {
    if (!bullet) continue;
    const bulletLines: string[] = doc.splitTextToSize(bullet, CONTENT_W - 30);
    let first = true;
    for (const bl of bulletLines) {
      ensurePageRoom(22);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(13);
      doc.setTextColor(...COLOR_BODY);
      if (first) {
        doc.text("•", MARGIN + 8, y);
        doc.text(bl, MARGIN + 26, y);
        first = false;
      } else {
        doc.text(bl, MARGIN + 26, y);
      }
      y += 20;
    }
    y += 6;
  }

  const renderSection = (label: string, paras: string[], italic = false) => {
    if (!paras.length) return;
    ensurePageRoom(60);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...COLOR_GOLD);
    doc.text(label, MARGIN, y);
    y += 20;
    for (const para of paras) {
      const lines: string[] = doc.splitTextToSize(para, CONTENT_W - 10);
      for (const line of lines) {
        ensurePageRoom(22);
        doc.setFont("times", italic ? "italic" : "normal");
        doc.setFontSize(13);
        doc.setTextColor(...COLOR_BODY);
        doc.text(line, MARGIN + 6, y);
        y += 20;
      }
      y += 4;
    }
  };

  renderSection("KEY POINT", mp.keyPoint);
  renderSection("REVELATION", mp.revelation);
  if (mp.quotable.length) renderSection("QUOTABLE", mp.quotable, true);

  drawFooter(doc, title, pageNum);
  return pageNum;
}

// ─── EPUB (unchanged — e-reader format) ─────────────────────────────

export function exportSermonToEpub(sermon: Sermon) {
  const sanitize = (t: string) =>
    t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const bookId = crypto.randomUUID();
  const mimetype = "application/epub+zip";

  const container = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${bookId}</dc:identifier>
    <dc:title>${sanitize(sermon.title)}</dc:title>
    <dc:creator>Bryant Clark</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().split(".")[0]}Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="sermon" href="sermon.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="sermon"/>
  </spine>
</package>`;

  const nav = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>${sanitize(sermon.title)}</title></head>
<body>
  <nav epub:type="toc">
    <h1>Table of Contents</h1>
    <ol>
      <li><a href="sermon.xhtml">${sanitize(sermon.title)}</a></li>
    </ol>
  </nav>
</body>
</html>`;

  const epubCss = `body { font-family: Georgia, "Times New Roman", serif; line-height: 1.7; margin: 1.5em; color: #222; }
h1 { text-align: center; font-size: 1.8em; font-weight: bold; margin-top: 1em; margin-bottom: 1.5em; }
h2 { font-size: 1.2em; font-weight: bold; margin-top: 2em; margin-bottom: 0.6em; }
h3 { font-size: 1.1em; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em; }
.scripture { text-align: center; font-style: italic; color: #555; margin-bottom: 2em; }
p { margin: 0 0 1.1em 0; }
ul, ol { margin-top: 1em; margin-bottom: 1.5em; padding-left: 1.2em; }
li { margin-bottom: 0.6em; }
p.first { text-indent: 0; }
.copyright { font-size: 0.75em; font-style: italic; color: #999; text-align: center; margin-top: 3em; border-top: 1px solid #ddd; padding-top: 1em; }`;

  const normalized = normalizeParagraphs(sermon.manuscript);
  const paras = normalized.split("\n\n").filter((p) => p.trim());
  const bodyHtml = paras
    .map((p, i) => `  <p${i === 0 ? ' class="first"' : ''}>${sanitize(p)}</p>`)
    .join("\n");

  const sermonXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${sanitize(sermon.title)}</title><style>${epubCss}</style></head>
<body>
  <h1>${sanitize(sermon.title)}</h1>
  <p class="scripture">${sanitize(sermon.scripture)}</p>
${bodyHtml}
  <p class="copyright">${sanitize(COPYRIGHT())}</p>
</body>
</html>`;

  const files = [
    { name: "mimetype", content: mimetype, noCompression: true },
    { name: "META-INF/container.xml", content: container },
    { name: "OEBPS/content.opf", content: contentOpf },
    { name: "OEBPS/nav.xhtml", content: nav },
    { name: "OEBPS/sermon.xhtml", content: sermonXhtml },
  ];

  const blob = buildEpubZip(files);
  triggerDownload(blob, `${safeTitle(sermon.title)}.epub`);
}

// ─── GoodNotes PDF (server-side, iPad-safe) ─────────────────────────

export async function exportSermonToGoodNotesPdf(sermon: Sermon) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const functionUrl = `${supabaseUrl}/functions/v1/generate-goodnotes-pdf`;

  const payload = {
    title: sermon.title,
    scriptureReference: sermon.scripture,
    manuscript: sermon.manuscript,
  };

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIOS) {
    try {
      const resp = await fetch(functionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error("Server error");
      const blob = await resp.blob();
      const slug = sermon.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      await triggerDownload(blob, `${safeTitle(sermon.title)}_GoodNotes.pdf`);
    } catch {
      window.location.href = functionUrl;
    }
    return;
  }

  try {
    const resp = await fetch(functionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error("Server error");
    const blob = await resp.blob();
    const slug = sermon.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeTitle(sermon.title)}_GoodNotes.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (err) {
    console.error("GoodNotes PDF download failed:", err);
  }
}

// ─── Word (.doc) — GoodNotes Pulpit Format ──────────────────────────

export function exportSermonToWord(sermon: Sermon) {
  const s = parseExportStructure(
    sermon.manuscript || "",
    sermon.title || "",
    sermon.scripture || "",
  );

  const BURGUNDY = "#8B1A2B";
  const GOLD = "#C9A24A";
  const SUB = "#28324F";
  const BODY = "#191919";
  const FOOT = "#969696";

  const sections: string[] = [];
  const dateLabel = formatSermonDate(sermon.date);

  // ── PAGE 1: COVER ──
  let cover = `<div style="page-break-after: always; padding: 140pt 40pt 0 40pt; text-align: center; min-height: 9in;">`;
  cover += `<h1 style="font-family: 'Playfair Display', 'Times New Roman', Georgia, serif; color: ${BURGUNDY}; font-size: 42pt; font-weight: 800; letter-spacing: 1px; margin: 0 0 18pt 0;">${escapeXml(s.title.toUpperCase())}</h1>`;
  if (s.subtitle) {
    cover += `<p style="font-family: 'Inter', Arial, sans-serif; color: ${SUB}; font-size: 18pt; margin: 0 0 80pt 0;">${escapeXml(s.subtitle)}</p>`;
  } else {
    cover += `<div style="height: 80pt;"></div>`;
  }
  cover += `<div style="margin-top: 220pt;">`;
  cover += `<p style="font-family: 'Inter', Arial, sans-serif; color: ${GOLD}; font-size: 13pt; font-weight: 700; letter-spacing: 2px; margin: 0 0 14pt 0;">${CHURCH_NAME}</p>`;
  cover += `<p style="font-family: 'Times New Roman', Georgia, serif; font-style: italic; color: ${BODY}; font-size: 14pt; margin: 0 0 10pt 0;">${SPEAKER_NAME}</p>`;
  if (dateLabel) {
    cover += `<p style="font-family: 'Inter', Arial, sans-serif; color: ${FOOT}; font-size: 11pt; margin: 0;">${escapeXml(dateLabel)}</p>`;
  }
  cover += `</div></div>`;
  sections.push(cover);

  const renderParas = (paras: string[], italic: boolean) =>
    paras.map(p =>
      `<p style="font-family: 'Times New Roman', Georgia, serif; color: ${BODY}; font-size: 13pt; line-height: 1.7; ${italic ? "font-style: italic;" : ""} margin: 0 0 0.6em 0;">${escapeXml(p)}</p>`
    ).join("");

  const subLabel = (label: string) =>
    `<p style="font-family: 'Inter', Arial, sans-serif; color: ${GOLD}; font-size: 12pt; font-weight: 700; letter-spacing: 1.5px; margin: 1.2em 0 0.4em 0;">${label}</p>`;

  // ── PAGE 2: SCRIPTURE ──
  let scripturePage = `<div style="page-break-before: always; page-break-after: always; text-align: center; padding-top: 120pt;">`;
  scripturePage += `<h2 style="font-family: 'Playfair Display', 'Times New Roman', serif; color: ${BURGUNDY}; font-size: 32pt; font-weight: 800; margin: 0 0 36pt 0;">SCRIPTURE</h2>`;
  if (s.scriptureReference) {
    scripturePage += `<p style="font-family: 'Times New Roman', Georgia, serif; color: ${BODY}; font-size: 20pt; font-weight: 700; margin: 0 0 18pt 0;">${escapeXml(s.scriptureReference)}</p>`;
  }
  if (s.scriptureText) {
    scripturePage += `<p style="font-family: 'Times New Roman', Georgia, serif; color: ${BODY}; font-size: 15pt; line-height: 1.7; margin: 0 40pt 0 40pt;">${escapeXml(s.scriptureText)}</p>`;
  }
  scripturePage += `</div>`;
  sections.push(scripturePage);

  // ── PAGE 3: ILLUSTRATION ──
  if (s.illustration.length) {
    let html = `<div style="page-break-before: always; page-break-after: always;">`;
    html += `<h2 style="font-family: 'Playfair Display', 'Times New Roman', serif; color: ${BURGUNDY}; font-size: 30pt; font-weight: 800; text-align: center; margin: 40pt 0 36pt 0;">ILLUSTRATION</h2>`;
    html += renderParas(s.illustration, false);
    html += `</div>`;
    sections.push(html);
  }

  // ── MAIN POINTS — each on its own page ──
  s.mainPoints.forEach((mp, idx) => {
    let html = `<div style="page-break-before: always;">`;
    html += `<p style="font-family: 'Inter', Arial, sans-serif; color: ${GOLD}; font-size: 11pt; font-weight: 700; letter-spacing: 2.5px; text-align: center; margin: 0 0 24pt 0;">MAIN POINT ${toRoman(idx + 1)}</p>`;
    html += `<h2 style="font-family: 'Playfair Display', 'Times New Roman', serif; color: ${BURGUNDY}; font-size: 24pt; font-weight: 800; text-transform: uppercase; text-align: center; margin: 0 0 30pt 0;">${escapeXml(mp.heading.toUpperCase())}</h2>`;
    if (mp.bullets.length) {
      html += `<ul style="font-family: 'Inter', Arial, sans-serif; color: ${BODY}; font-size: 13pt; line-height: 1.7; margin: 0 0 0 0.3in; padding: 0;">`;
      for (const b of mp.bullets) {
        if (b) html += `<li style="margin-bottom: 0.5em;">${escapeXml(b)}</li>`;
      }
      html += `</ul>`;
    }
    if (mp.keyPoint.length) { html += subLabel("KEY POINT"); html += renderParas(mp.keyPoint, false); }
    if (mp.revelation.length) { html += subLabel("REVELATION"); html += renderParas(mp.revelation, false); }
    if (mp.quotable.length) { html += subLabel("QUOTABLE"); html += renderParas(mp.quotable, true); }
    html += `</div>`;
    sections.push(html);
  });

  // ── ALTAR CALL ──
  if (s.closing.length) {
    let html = `<div style="page-break-before: always;">`;
    html += `<h2 style="font-family: 'Playfair Display', 'Times New Roman', serif; color: ${BURGUNDY}; font-size: 30pt; font-weight: 800; text-align: center; margin: 40pt 0 36pt 0;">ALTAR CALL</h2>`;
    html += renderParas(s.closing, false);
    html += `</div>`;
    sections.push(html);
  }

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${escapeXml(sermon.title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Inter:wght@400;600;700&display=swap');
  @page { size: A4 portrait; margin: 0.9in; }
  body { font-family: 'Times New Roman', Georgia, serif; margin: 0.9in; color: ${BODY}; line-height: 1.65; font-size: 13pt; }
  .copyright { font-family: 'Inter', Arial, sans-serif; font-size: 9pt; font-style: italic; color: ${FOOT}; text-align: center; margin-top: 2in; padding-top: 0.5in; }
</style></head>
<body>
${sections.join("\n")}
  <p class="copyright">${escapeXml(COPYRIGHT())}</p>
</body></html>`;

  const blob = new Blob([html], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  triggerDownload(blob, `${safeTitle(sermon.title)}.docx`);
}
