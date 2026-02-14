import { jsPDF } from "jspdf";
import { stripHtml, normalizeParagraphs, buildEpubZip, crc32 } from "@/lib/bookExport";
import { triggerDownload } from "@/lib/downloadHelper";
import type { Sermon } from "@/hooks/useSermons";

const COPYRIGHT = () =>
  `© ${new Date().getFullYear()} The Island of One. All rights reserved. For personal use only.`;

const safeTitle = (title: string) => title.replace(/[^a-zA-Z0-9]/g, "_");

// ─── PDF ────────────────────────────────────────────────────────────────────

export function exportSermonToPdf(sermon: Sermon) {
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginTop = 20;
  const marginBottom = 18;
  const marginSide = 18;
  const contentW = pageW - marginSide * 2;
  const lineHeight = 5.5;
  const paraGap = 4;
  const firstLineIndent = 8;

  // Title page
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  const titleLines = doc.splitTextToSize(sermon.title, contentW - 10);
  const titleY = pageH * 0.3;
  doc.text(titleLines, pageW / 2, titleY, { align: "center" });

  if (sermon.scripture) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(14);
    const subY = titleY + titleLines.length * 11 + 8;
    doc.text(doc.splitTextToSize(sermon.scripture, contentW - 10), pageW / 2, subY, {
      align: "center",
    });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("By Bryant Clark", pageW / 2, pageH * 0.6, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(COPYRIGHT(), pageW / 2, pageH * 0.85, { align: "center" });

  // Manuscript body
  doc.addPage();
  let y = marginTop;
  doc.setFont("times", "normal");
  doc.setFontSize(11);

  const normalized = normalizeParagraphs(sermon.manuscript);
  const paras = normalized.split("\n\n").filter((p) => p.trim());

  paras.forEach((para, pIdx) => {
    const wrapped: string[] = doc.splitTextToSize(para, contentW - firstLineIndent);

    if (y + wrapped.length * lineHeight > pageH - marginBottom && y > marginTop + 10) {
      doc.addPage();
      y = marginTop;
    }

    wrapped.forEach((line: string, lIdx: number) => {
      if (y > pageH - marginBottom) {
        doc.addPage();
        y = marginTop;
      }
      const x = lIdx === 0 && pIdx > 0 ? marginSide + firstLineIndent : marginSide;
      doc.text(line, x, y);
      y += lineHeight;
    });
    y += paraGap;
  });

  const pdfBlob = doc.output("blob");
  triggerDownload(pdfBlob, `${safeTitle(sermon.title)}.pdf`);
}

// ─── EPUB ───────────────────────────────────────────────────────────────────

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

  const paras = normalizeParagraphs(sermon.manuscript)
    .split("\n\n")
    .filter((p) => p.trim());
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

// ─── Word (.doc) ────────────────────────────────────────────────────────────

export function exportSermonToWord(sermon: Sermon) {
  // Pass raw HTML from rich text editor directly – Word renders it natively
  const manuscriptHtml = sermon.manuscript || "";

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${sermon.title}</title>
<style>
  body { font-family: Georgia, "Times New Roman", serif; margin: 1in; color: #222; line-height: 1.8; }
  h1 { text-align: center; font-size: 24pt; margin-top: 2em; }
  h2 { font-size: 18pt; margin-top: 1.5em; }
  h3 { font-size: 14pt; margin-top: 1.2em; }
  .scripture { text-align: center; font-style: italic; color: #555; font-size: 14pt; margin-bottom: 2em; }
  .author { text-align: center; font-size: 12pt; margin-bottom: 3em; }
  .copyright { font-size: 9pt; font-style: italic; color: #999; text-align: center; margin-top: 3em; border-top: 1px solid #ddd; padding-top: 1em; }
  p { margin: 0.6em 0; text-align: justify; }
  strong, b { font-weight: bold; }
  em, i { font-style: italic; }
  u { text-decoration: underline; }
  ul { list-style-type: disc; margin-left: 1.5em; }
  ol { list-style-type: decimal; margin-left: 1.5em; }
  li { margin: 0.3em 0; }
  blockquote { margin: 1em 2em; padding-left: 1em; border-left: 3px solid #ccc; font-style: italic; color: #555; }
  sub { vertical-align: sub; font-size: 0.8em; }
  sup { vertical-align: super; font-size: 0.8em; }
</style></head>
<body>
  <h1>${sermon.title}</h1>
  <p class="scripture">${sermon.scripture}</p>
  <p class="author">By Bryant Clark</p>
  <div class="manuscript">${manuscriptHtml}</div>
  <p class="copyright">${COPYRIGHT()}</p>
</body></html>`;

  const blob = new Blob([html], { type: "application/msword" });
  triggerDownload(blob, `${safeTitle(sermon.title)}.doc`);
}
