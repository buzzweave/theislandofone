import { jsPDF } from "jspdf";
import type { Book } from "@/hooks/useBooks";
import { triggerDownload } from "@/lib/downloadHelper";

/**
 * Normalize pasted text into clean paragraphs.
 * - Joins lines that were broken mid-sentence (orphaned words like "I" on their own line)
 * - Preserves intentional paragraph breaks (double newlines or lines ending with sentence-ending punctuation)
 */
/**
 * Strip HTML tags and decode common entities, then normalize into clean paragraphs.
 */
export function stripHtml(html: string): string {
  let text = html.replace(/<\/p>/gi, "\n").replace(/<\/div>/gi, "\n").replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<[^>]+>/g, "");
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  return text;
}

export function normalizeParagraphs(text: string): string {
  const cleaned = stripHtml(text);
  const lines = cleaned.split("\n").map((l) => l.trim());
  const paragraphs: string[] = [];
  let current = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      if (current) {
        paragraphs.push(current);
        current = "";
      }
      continue;
    }
    if (!current) {
      current = line;
    } else {
      current += " " + line;
    }
  }
  if (current) paragraphs.push(current);
  return paragraphs.join("\n\n");
}

// --- Cover image resizing utility ---
async function fetchImageAsDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => reject(new Error("Failed to load cover image"));
    img.src = url;
  });
}

async function resizeCoverForEpub(url: string, targetW = 1600, targetH = 2560): Promise<{ dataUrl: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d")!;
      // Fill background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetW, targetH);
      // Draw cover image scaled to fit
      const scale = Math.min(targetW / img.naturalWidth, targetH / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.drawImage(img, (targetW - w) / 2, (targetH - h) / 2, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Canvas toBlob failed"));
          const reader = new FileReader();
          reader.onloadend = () => resolve({ dataUrl: reader.result as string, blob });
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => reject(new Error("Failed to load cover image for resize"));
    img.src = url;
  });
}

/** Generate a resized marketing cover as a downloadable file */
export async function generateMarketingCover(coverUrl: string, title: string) {
  const { blob } = await resizeCoverForEpub(coverUrl, 1600, 2560);
  triggerDownload(blob, `${title.replace(/[^a-zA-Z0-9]/g, "_")}_cover_1600x2560.jpg`);
}

/** Check cover dimensions against store minimums */
export async function checkCoverDimensions(coverUrl: string): Promise<{ width: number; height: number; appleOk: boolean; kdpOk: boolean }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      resolve({
        width: w,
        height: h,
        appleOk: Math.min(w, h) >= 1400,
        kdpOk: w >= 625 && h >= 1000,
      });
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = coverUrl;
  });
}

export function exportBookToPdf(book: Book) {
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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  const titleLines = doc.splitTextToSize(book.title, contentW - 10);
  const titleY = pageH * 0.32;
  doc.text(titleLines, pageW / 2, titleY, { align: "center" });

  if (book.subtitle) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(14);
    const subY = titleY + titleLines.length * 11 + 8;
    doc.text(doc.splitTextToSize(book.subtitle, contentW - 10), pageW / 2, subY, { align: "center" });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`by ${book.author}`, pageW / 2, pageH * 0.62, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(
    `© ${new Date().getFullYear()} The Island of One. All rights reserved. For personal use only.`,
    pageW / 2, pageH * 0.85, { align: "center" }
  );

  book.chapters.forEach((chapter, i) => {
    doc.addPage();
    let y = marginTop + 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.text(`CHAPTER ${i + 1}`, pageW / 2, y, { align: "center" });
    y += 10;
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    const chTitleLines = doc.splitTextToSize(chapter.title, contentW);
    doc.text(chTitleLines, pageW / 2, y, { align: "center" });
    y += chTitleLines.length * 8 + 14;

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    const normalized = normalizeParagraphs(chapter.content);
    const paras = normalized.split("\n\n").filter((p) => p.trim());

    paras.forEach((para, pIdx) => {
      const wrapped: string[] = doc.splitTextToSize(para, contentW - firstLineIndent);
      if (y + wrapped.length * lineHeight > pageH - marginBottom && y > marginTop + 30) {
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
  });

  const pdfBlob = doc.output("blob");
  triggerDownload(pdfBlob, `${book.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}

// --- EPUB 3 with proper cover ---
export async function exportBookToEpub(book: Book) {
  if (!book.cover_image) {
    throw new Error("Add a cover image before exporting.");
  }

  // Resize cover for EPUB embedding (1600x2560)
  let coverJpegBytes: Uint8Array;
  try {
    const { blob } = await resizeCoverForEpub(book.cover_image, 1600, 2560);
    coverJpegBytes = new Uint8Array(await blob.arrayBuffer());
  } catch {
    throw new Error("Failed to process cover image. Ensure the cover URL is accessible.");
  }

  const sanitize = (text: string) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const bookId = crypto.randomUUID();
  const mimetype = "application/epub+zip";

  const container = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  const chapterItems = book.chapters
    .map((_, i) => `    <item id="ch${i}" href="ch${i}.xhtml" media-type="application/xhtml+xml"/>`)
    .join("\n");

  const chapterSpine = book.chapters
    .map((_, i) => `    <itemref idref="ch${i}"/>`)
    .join("\n");

  // EPUB 3 OPF with proper cover image declaration
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${bookId}</dc:identifier>
    <dc:title>${sanitize(book.title)}</dc:title>
    <dc:creator>${sanitize(book.author)}</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().split(".")[0]}Z</meta>
    <meta name="cover" content="cover-image"/>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="cover-xhtml" href="cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="cover-image" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>
${chapterItems}
  </manifest>
  <spine>
    <itemref idref="cover-xhtml"/>
${chapterSpine}
  </spine>
</package>`;

  const tocItems = book.chapters
    .map((ch, i) => `        <li><a href="ch${i}.xhtml">${sanitize(ch.title)}</a></li>`)
    .join("\n");

  const nav = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>${sanitize(book.title)}</title></head>
<body>
  <nav epub:type="toc">
    <h1>Table of Contents</h1>
    <ol>
${tocItems}
    </ol>
  </nav>
</body>
</html>`;

  // Cover page XHTML
  const coverXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Cover</title>
<style>
  body { margin: 0; padding: 0; text-align: center; }
  img { max-width: 100%; max-height: 100%; }
</style>
</head>
<body>
  <div style="text-align:center;">
    <img src="images/cover.jpg" alt="${sanitize(book.title)}" />
  </div>
</body>
</html>`;

  const copyrightNotice = `© ${new Date().getFullYear()} The Island of One. All rights reserved. For personal use only.`;

  const epubCss = `body { font-family: Georgia, "Times New Roman", serif; line-height: 1.8; margin: 1.5em; color: #222; }
h1 { text-align: center; font-size: 1.6em; margin-top: 2em; margin-bottom: 0.3em; }
.chapter-num { text-align: center; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.15em; color: #888; margin-bottom: 0.5em; }
p { text-indent: 1.5em; margin: 0.6em 0; text-align: justify; }
p.first { text-indent: 0; }
p.first::first-letter { float: left; font-size: 3.8em; line-height: 0.8; padding-right: 0.08em; padding-top: 0.05em; color: #6b2c2c; font-weight: bold; font-family: Georgia, "Times New Roman", serif; }
.copyright { font-size: 0.75em; font-style: italic; color: #999; text-align: center; margin-top: 3em; border-top: 1px solid #ddd; padding-top: 1em; }`;

  const chapterFiles = book.chapters.map((ch, i) => {
    const paras = normalizeParagraphs(ch.content).split("\n\n").filter((p) => p.trim());
    const bodyHtml = paras
      .map((p, pIdx) => `  <p${pIdx === 0 ? ' class="first"' : ''}>${sanitize(p)}</p>`)
      .join("\n");
    return {
      name: `OEBPS/ch${i}.xhtml`,
      content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${sanitize(ch.title)}</title><style>${epubCss}</style></head>
<body>
  <div class="chapter-num">Chapter ${i + 1}</div>
  <h1>${sanitize(ch.title)}</h1>
${bodyHtml}
  <p class="copyright">${sanitize(copyrightNotice)}</p>
</body>
</html>`,
    };
  });

  // Build ZIP with text files + binary cover image
  const encoder = new TextEncoder();
  const textFiles: { name: string; data: Uint8Array; noCompression?: boolean }[] = [
    { name: "mimetype", data: encoder.encode(mimetype), noCompression: true },
    { name: "META-INF/container.xml", data: encoder.encode(container) },
    { name: "OEBPS/content.opf", data: encoder.encode(contentOpf) },
    { name: "OEBPS/nav.xhtml", data: encoder.encode(nav) },
    { name: "OEBPS/cover.xhtml", data: encoder.encode(coverXhtml) },
    { name: "OEBPS/images/cover.jpg", data: coverJpegBytes },
    ...chapterFiles.map((f) => ({ name: f.name, data: encoder.encode(f.content) })),
  ];

  const blob = buildEpubZipBinary(textFiles);
  triggerDownload(blob, `${book.title.replace(/[^a-zA-Z0-9]/g, "_")}.epub`);
}

// Updated ZIP builder that handles binary data (Uint8Array)
export function buildEpubZipBinary(files: { name: string; data: Uint8Array; noCompression?: boolean }[]) {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = file.data;
    const crc = crc32(contentBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(8, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, contentBytes.length, true);
    lv.setUint32(22, contentBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    localHeader.set(nameBytes, 30);

    const cdEntry = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cdEntry.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(10, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, contentBytes.length, true);
    cv.setUint32(24, contentBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    cdEntry.set(nameBytes, 46);

    parts.push(localHeader, contentBytes);
    centralDir.push(cdEntry);
    offset += localHeader.length + contentBytes.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const cd of centralDir) cdSize += cd.length;

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdOffset, true);

  return new Blob(
    [...parts, ...centralDir, eocd].map((b) => new Uint8Array(b.buffer as ArrayBuffer, b.byteOffset, b.byteLength)),
    { type: "application/epub+zip" }
  );
}

// Keep legacy buildEpubZip for backwards compat
export function buildEpubZip(files: { name: string; content: string; noCompression?: boolean }[]) {
  const encoder = new TextEncoder();
  return buildEpubZipBinary(files.map((f) => ({ name: f.name, data: encoder.encode(f.content), noCompression: f.noCompression })));
}

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function exportBookToWord(book: Book) {
  const chapters = book.chapters
    .map((ch, i) => {
      const chapterHtml = ch.content || "";
      return `<h2 style="text-align:center;font-size:11pt;text-transform:uppercase;letter-spacing:0.15em;color:#888;margin-top:3em;">Chapter ${i + 1}</h2>
<h1 style="text-align:center;font-size:18pt;margin-bottom:1em;">${ch.title}</h1>
<div class="chapter-body">${chapterHtml}</div>`;
    })
    .join("\n<br clear=all style='page-break-before:always'>\n");

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${book.title}</title>
<style>
  body { font-family: Georgia, "Times New Roman", serif; margin: 1in; color: #222; line-height: 1.8; }
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
  <div style="text-align:center;margin-top:3in;">
    <h1 style="font-size:26pt;">${book.title}</h1>
    ${book.subtitle ? `<p style="font-size:14pt;font-style:italic;color:#555;">${book.subtitle}</p>` : ""}
    <p style="font-size:12pt;margin-top:2em;">by ${book.author}</p>
  </div>
  <br clear=all style='page-break-before:always'>
${chapters}
  <p class="copyright">© ${new Date().getFullYear()} The Island of One. All rights reserved. For personal use only.</p>
</body></html>`;

  const blob = new Blob([html], { type: "application/msword" });
  triggerDownload(blob, `${book.title.replace(/[^a-zA-Z0-9]/g, "_")}.doc`);
}
