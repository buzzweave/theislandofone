import { jsPDF } from "jspdf";
import { buildEpubZip } from "@/lib/bookExport";
import { triggerDownload } from "@/lib/downloadHelper";
import { COPYRIGHT } from "@/lib/pulpitFormat";
import { parseExportStructure, type ExportStructure } from "@/lib/sermonExportFormatter";
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

// ─── A4 constants ──────────────────────────────────────────────────

const A4W = 595;
const A4H = 842;
const MARGIN = 56;
const CONTENT_W = A4W - MARGIN * 2;

// ─── PDF Export — Preach-Ready Pulpit Format ────────────────────────

export function exportSermonToPdf(sermon: Sermon) {
  const doc = new jsPDF({ unit: "pt", format: [A4W, A4H], orientation: "portrait" });

  const structure = parseExportStructure(
    sermon.manuscript || "",
    sermon.title || "",
    sermon.scripture || "",
  );

  renderPdfFromStructure(doc, structure);

  const pdfBlob = doc.output("blob");
  triggerDownload(pdfBlob, `${safeTitle(sermon.title)}.pdf`);
}

function renderPdfFromStructure(doc: jsPDF, s: ExportStructure) {
  // ─── PAGE 1: Title Only ──────────────────────────────────────
  doc.setFont("times", "bold");
  doc.setFontSize(42);
  const titleLines: string[] = doc.splitTextToSize(s.title, CONTENT_W);
  const titleBlockH = titleLines.length * 50;
  let y = (A4H / 2) - (titleBlockH / 2);
  if (y < MARGIN) y = MARGIN;
  for (const line of titleLines) {
    doc.text(line, A4W / 2, y, { align: "center" });
    y += 50;
  }

  // ─── PAGE 2: Scripture ───────────────────────────────────────
  if (s.scriptureReference || s.scriptureText) {
    doc.addPage([A4W, A4H]);
    y = MARGIN;

    doc.setFont("times", "bold");
    doc.setFontSize(28);
    doc.text("SCRIPTURE", A4W / 2, y, { align: "center" });
    y += 44;

    if (s.scriptureReference) {
      doc.setFont("times", "italic");
      doc.setFontSize(18);
      const refLines: string[] = doc.splitTextToSize(s.scriptureReference, CONTENT_W);
      for (const line of refLines) {
        doc.text(line, A4W / 2, y, { align: "center" });
        y += 24;
      }
      y += 16;
    }

    if (s.scriptureText) {
      doc.setFont("times", "normal");
      doc.setFontSize(16);
      const textLines: string[] = doc.splitTextToSize(s.scriptureText, CONTENT_W);
      for (const line of textLines) {
        if (y + 22 > A4H - MARGIN) { doc.addPage([A4W, A4H]); y = MARGIN; }
        doc.text(line, MARGIN, y);
        y += 22;
      }
    }
  }

  // ─── PAGE 3: Illustration ────────────────────────────────────
  if (s.illustration.length > 0) {
    doc.addPage([A4W, A4H]);
    y = MARGIN;

    doc.setFont("times", "bold");
    doc.setFontSize(28);
    doc.text("ILLUSTRATION", A4W / 2, y, { align: "center" });
    y += 44;

    doc.setFont("times", "normal");
    doc.setFontSize(14);
    for (const para of s.illustration) {
      const wrapped: string[] = doc.splitTextToSize(para, CONTENT_W);
      for (const line of wrapped) {
        if (y + 22 > A4H - MARGIN) { doc.addPage([A4W, A4H]); y = MARGIN; }
        doc.text(line, MARGIN, y);
        y += 22;
      }
      y += 12; // generous spacing
    }
  }

  // ─── MAIN POINTS — each on its own page ──────────────────────
  for (const mp of s.mainPoints) {
    doc.addPage([A4W, A4H]);
    y = MARGIN;

    // Heading
    doc.setFont("times", "bold");
    doc.setFontSize(26);
    const headingLines: string[] = doc.splitTextToSize(mp.heading, CONTENT_W);
    for (const hl of headingLines) {
      doc.text(hl, MARGIN, y);
      y += 34;
    }
    y += 8;

    // Summary paragraph
    if (mp.summary) {
      doc.setFont("times", "normal");
      doc.setFontSize(15);
      const summaryLines: string[] = doc.splitTextToSize(mp.summary, CONTENT_W);
      for (const sl of summaryLines) {
        doc.text(sl, MARGIN, y);
        y += 22;
      }
      y += 14;
    }

    // 6 bullet points with generous spacing
    doc.setFont("times", "normal");
    doc.setFontSize(14);
    for (const bullet of mp.bullets) {
      if (!bullet) continue;
      const bulletText = `•  ${bullet}`;
      const bulletLines: string[] = doc.splitTextToSize(bulletText, CONTENT_W - 30);
      for (const bl of bulletLines) {
        doc.text(bl, MARGIN + 20, y);
        y += 22;
      }
      y += 10; // even spacing between bullets
    }
  }

  // ─── CLOSING PAGE ───────────────────────────────────────────
  if (s.closing.length > 0) {
    doc.addPage([A4W, A4H]);
    y = MARGIN;

    doc.setFont("times", "bold");
    doc.setFontSize(28);
    doc.text("CLOSING", A4W / 2, y, { align: "center" });
    y += 44;

    doc.setFont("times", "normal");
    doc.setFontSize(14);
    for (const para of s.closing) {
      const wrapped: string[] = doc.splitTextToSize(para, CONTENT_W);
      for (const line of wrapped) {
        if (y + 22 > A4H - MARGIN) { doc.addPage([A4W, A4H]); y = MARGIN; }
        doc.text(line, MARGIN, y);
        y += 22;
      }
      y += 12;
    }
  }

  // Copyright on last page
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text(COPYRIGHT(), A4W / 2, A4H - 30, { align: "center" });
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
      await triggerDownload(blob, `${slug}-goodnotes.pdf`);
    } catch {
      window.location.href = functionUrl;
    }
    return;
  }

  // Desktop
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
    a.download = `${slug}-goodnotes.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (err) {
    console.error("GoodNotes PDF download failed:", err);
  }
}

// ─── Word (.doc) — Preach-Ready Pulpit Format with Playfair Display ─

export function exportSermonToWord(sermon: Sermon) {
  const structure = parseExportStructure(
    sermon.manuscript || "",
    sermon.title || "",
    sermon.scripture || "",
  );

  const sections: string[] = [];

  // Title page
  sections.push(`
    <div style="page-break-after: always; display: flex; align-items: center; justify-content: center; min-height: 90vh; text-align: center;">
      <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 38pt; font-weight: 800; text-align: center; margin: 0;">${escapeXml(structure.title)}</h1>
    </div>
  `);

  // Scripture page
  if (structure.scriptureReference || structure.scriptureText) {
    let scriptureHtml = `<div style="page-break-before: always; page-break-after: always;">`;
    scriptureHtml += `<h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 26pt; font-weight: 800; text-align: center; text-transform: uppercase; margin-bottom: 0.8em;">SCRIPTURE</h2>`;
    if (structure.scriptureReference) {
      scriptureHtml += `<p style="font-family: 'Playfair Display', Georgia, serif; font-size: 16pt; font-style: italic; text-align: center; margin-bottom: 1.2em;">${escapeXml(structure.scriptureReference)}</p>`;
    }
    if (structure.scriptureText) {
      scriptureHtml += `<p style="font-family: Georgia, serif; font-size: 14pt; line-height: 1.8;">${escapeXml(structure.scriptureText)}</p>`;
    }
    scriptureHtml += `</div>`;
    sections.push(scriptureHtml);
  }

  // Illustration page
  if (structure.illustration.length > 0) {
    let illHtml = `<div style="page-break-before: always; page-break-after: always;">`;
    illHtml += `<h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 26pt; font-weight: 800; text-align: center; text-transform: uppercase; margin-bottom: 0.8em;">ILLUSTRATION</h2>`;
    for (const para of structure.illustration) {
      illHtml += `<p style="font-family: Georgia, serif; font-size: 14pt; line-height: 2; margin-bottom: 1.2em;">${escapeXml(para)}</p>`;
    }
    illHtml += `</div>`;
    sections.push(illHtml);
  }

  // Main Points — each on its own page
  for (const mp of structure.mainPoints) {
    let mpHtml = `<div style="page-break-before: always; page-break-after: always; page-break-inside: avoid;">`;
    mpHtml += `<h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 24pt; font-weight: 800; text-transform: uppercase; margin-bottom: 0.6em;">${escapeXml(mp.heading)}</h2>`;
    if (mp.summary) {
      mpHtml += `<p style="font-family: Georgia, serif; font-size: 14pt; line-height: 1.8; margin-bottom: 1em;">${escapeXml(mp.summary)}</p>`;
    }
    mpHtml += `<ul style="font-family: Georgia, serif; font-size: 13pt; line-height: 1.7; margin-left: 0.4in; margin-top: 0.8em;">`;
    for (const bullet of mp.bullets) {
      if (bullet) {
        mpHtml += `<li style="margin-bottom: 0.7em;">${escapeXml(bullet)}</li>`;
      }
    }
    mpHtml += `</ul></div>`;
    sections.push(mpHtml);
  }

  // Closing page
  if (structure.closing.length > 0) {
    let closeHtml = `<div style="page-break-before: always;">`;
    closeHtml += `<h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 26pt; font-weight: 800; text-align: center; text-transform: uppercase; margin-bottom: 0.8em;">CLOSING</h2>`;
    for (const para of structure.closing) {
      closeHtml += `<p style="font-family: Georgia, serif; font-size: 14pt; line-height: 2; margin-bottom: 1.2em;">${escapeXml(para)}</p>`;
    }
    closeHtml += `</div>`;
    sections.push(closeHtml);
  }

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${escapeXml(sermon.title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800;900&display=swap');
  @page { size: A4 portrait; margin: 1in; }
  body { font-family: Georgia, "Times New Roman", serif; margin: 1in; color: #000; line-height: 1.7; font-size: 13pt; }
  .copyright { font-size: 9pt; font-style: italic; color: #999; text-align: center; margin-top: 2in; border-top: 1px solid #ddd; padding-top: 0.5in; }
</style></head>
<body>
${sections.join("\n")}
  <p class="copyright">${escapeXml(COPYRIGHT())}</p>
</body></html>`;

  const blob = new Blob([html], { type: "application/msword" });
  triggerDownload(blob, `${safeTitle(sermon.title)}.doc`);
}
