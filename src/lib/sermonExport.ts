import { jsPDF } from "jspdf";
import { buildEpubZip } from "@/lib/bookExport";
import { triggerDownload } from "@/lib/downloadHelper";
import {
  parsePulpitFormat,
  layoutPages,
  COPYRIGHT,
  A4_W,
  A4_H,
  MARGIN,
  CONTENT_W,
  FONT,
} from "@/lib/pulpitFormat";
import type { Sermon } from "@/hooks/useSermons";

const safeTitle = (title: string) => title.replace(/[^a-zA-Z0-9]/g, "_");

// ── Shared helper ───────────────────────────────────────────────────────

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

// ─── PDF — GOODNOTES PULPIT FORMAT ──────────────────────────────────────

export function exportSermonToPdf(sermon: Sermon) {
  const doc = new jsPDF({ unit: "pt", format: "a4" }); // 595 × 842 portrait
  const pageW = A4_W;
  const pageH = A4_H;
  let y = MARGIN;

  const newPage = () => { doc.addPage(); y = MARGIN; };
  const checkPage = (needed: number) => { if (y + needed > pageH - MARGIN) newPage(); };

  // ── Title Page ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.title.size);
  const titleLines = doc.splitTextToSize(sermon.title, CONTENT_W);
  const titleBlockH = titleLines.length * FONT.title.leading;
  y = Math.max(MARGIN, (pageH - titleBlockH) * 0.35);
  doc.text(titleLines, pageW / 2, y, { align: "center" });
  y += titleBlockH + 30;

  if (sermon.scripture) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FONT.scriptureHeader.size);
    const refLines = doc.splitTextToSize(sermon.scripture.toUpperCase(), CONTENT_W - 40);
    doc.text(refLines, pageW / 2, y, { align: "center" });
    y += refLines.length * FONT.scriptureHeader.leading + 16;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text("By Bryant Clark", pageW / 2, Math.min(y + 20, pageH * 0.65), { align: "center" });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(FONT.copyright.size);
  doc.text(COPYRIGHT(), pageW / 2, pageH - 40, { align: "center" });

  // ── Main Point Pages ──
  const pulpit = parsePulpitFormat(sermon.manuscript, sermon.title, sermon.scripture);
  const pages = layoutPages(pulpit.sections);

  for (const page of pages) {
    newPage();

    if (page.heading) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(FONT.mainPoint.size);
      const hLines = doc.splitTextToSize(page.heading.toUpperCase(), CONTENT_W);
      for (const hl of hLines) {
        doc.text(hl, MARGIN, y);
        y += FONT.mainPoint.leading;
      }
      y += 16;
    }

    const bulletCount = page.bullets.length;
    const availableH = pageH - MARGIN - y;
    const baseLineH = FONT.bullet.leading;
    const dynamicGap = Math.max(baseLineH, Math.min(availableH / Math.max(bulletCount, 1), 60));

    for (const bullet of page.bullets) {
      doc.setFont("times", "normal");
      doc.setFontSize(FONT.bullet.size);
      const bLines = doc.splitTextToSize(bullet, CONTENT_W - 24);

      for (let i = 0; i < bLines.length; i++) {
        checkPage(baseLineH);
        if (i === 0) {
          doc.text("\u2022", MARGIN + 4, y);
          doc.text(bLines[i], MARGIN + 24, y);
        } else {
          doc.text(bLines[i], MARGIN + 24, y);
        }
        y += baseLineH;
      }
      y += dynamicGap - baseLineH;
    }
  }

  // Final copyright
  doc.setFont("helvetica", "italic");
  doc.setFontSize(FONT.copyright.size);
  doc.text(COPYRIGHT(), pageW / 2, pageH - 40, { align: "center" });

  const pdfBlob = doc.output("blob");
  triggerDownload(pdfBlob, `${safeTitle(sermon.title)}.pdf`);
}

// ─── EPUB (unchanged — e-reader format) ─────────────────────────────────

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

  const epubCss = `body { font-family: Georgia, "Times New Roman", serif; line-height: 1.8; margin: 1.5em; color: #222; }
h1 { text-align: center; font-size: 1.6em; margin-top: 2em; margin-bottom: 0.3em; }
.scripture { text-align: center; font-style: italic; color: #555; margin-bottom: 2em; }
p { text-indent: 1.5em; margin: 0.6em 0; text-align: justify; }
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

// ─── GoodNotes PDF (server-side, iPad-safe) ─────────────────────────────

export async function exportSermonToGoodNotesPdf(sermon: Sermon) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const functionUrl = `${supabaseUrl}/functions/v1/generate-goodnotes-pdf`;

  const payload = {
    title: sermon.title,
    scriptureReference: sermon.scripture,
    scriptureText: "",
    mainPoints: [] as { heading: string; bullets: string[] }[],
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

// ─── Word (.doc) — GOODNOTES PULPIT FORMAT ──────────────────────────────

export function exportSermonToWord(sermon: Sermon) {
  const pulpit = parsePulpitFormat(sermon.manuscript, sermon.title, sermon.scripture);
  const pages = layoutPages(pulpit.sections);

  const sanitize = (t: string) =>
    t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  let sectionsHtml = "";
  for (const page of pages) {
    sectionsHtml += `<div style="page-break-before: always;">`;
    if (page.heading) {
      sectionsHtml += `<h2 style="font-size:28pt; font-weight:bold; text-transform:uppercase; text-align:left; margin-top:0.5in; margin-bottom:0.3in;">${sanitize(page.heading)}</h2>`;
    }
    sectionsHtml += `<ul style="list-style-type:disc; font-size:16pt; line-height:2.2; margin-left:0.3in;">`;
    for (const bullet of page.bullets) {
      sectionsHtml += `<li style="margin-bottom:0.15in;">${sanitize(bullet)}</li>`;
    }
    sectionsHtml += `</ul></div>`;
  }

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${sanitize(sermon.title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  @page { size: A4 portrait; margin: 1in; }
  body { font-family: Georgia, "Times New Roman", serif; margin: 1in; color: #000; line-height: 1.8; }
  h1 { text-align: center; font-size: 40pt; font-weight: bold; margin-top: 2in; margin-bottom: 0.5in; }
  .scripture { text-align: center; font-size: 24pt; font-weight: bold; text-transform: uppercase; margin-bottom: 0.3in; }
  .author { text-align: center; font-size: 14pt; margin-bottom: 2in; }
  .copyright { font-size: 9pt; font-style: italic; color: #999; text-align: center; margin-top: 2in; border-top: 1px solid #ddd; padding-top: 0.5in; }
  h2 { font-size: 28pt; font-weight: bold; text-transform: uppercase; text-align: left; }
  ul { list-style-type: disc; font-size: 16pt; line-height: 2.2; }
  li { margin-bottom: 0.15in; }
</style></head>
<body>
  <h1>${sanitize(sermon.title)}</h1>
  <p class="scripture">${sanitize(sermon.scripture)}</p>
  <p class="author">By Bryant Clark</p>
${sectionsHtml}
  <p class="copyright">${sanitize(COPYRIGHT())}</p>
</body></html>`;

  const blob = new Blob([html], { type: "application/msword" });
  triggerDownload(blob, `${safeTitle(sermon.title)}.doc`);
}
