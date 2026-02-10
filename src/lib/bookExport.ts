import { jsPDF } from "jspdf";
import type { Book } from "@/hooks/useBooks";

/**
 * Normalize pasted text into clean paragraphs.
 * - Joins lines that were broken mid-sentence (orphaned words like "I" on their own line)
 * - Preserves intentional paragraph breaks (double newlines or lines ending with sentence-ending punctuation)
 */
function normalizeParagraphs(text: string): string {
  // Split into lines and trim each
  const lines = text.split("\n").map((l) => l.trim());
  const paragraphs: string[] = [];
  let current = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Empty line = paragraph break
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
      // Join to current paragraph with a space
      current += " " + line;
    }
  }
  if (current) paragraphs.push(current);

  return paragraphs.join("\n\n");
}

export function exportBookToPdf(book: Book) {
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;

  // --- Title page ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  const titleLines = doc.splitTextToSize(book.title, contentW);
  doc.text(titleLines, pageW / 2, pageH * 0.35, { align: "center" });

  if (book.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.text(book.subtitle, pageW / 2, pageH * 0.35 + titleLines.length * 10 + 6, {
      align: "center",
    });
  }

  doc.setFontSize(11);
  doc.text(`by ${book.author}`, pageW / 2, pageH * 0.65, { align: "center" });

  // Copyright notice on title page
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(
    `© ${new Date().getFullYear()} The Island of One. All rights reserved. For personal use only.`,
    pageW / 2,
    pageH * 0.85,
    { align: "center" }
  );

  // --- Chapters ---
  book.chapters.forEach((chapter, i) => {
    doc.addPage();

    // Chapter heading
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Chapter ${i + 1}`, margin, margin + 5);
    doc.setFontSize(14);
    doc.text(chapter.title, margin, margin + 13);

    // Content – normalize pasted text into clean paragraphs
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const normalized = normalizeParagraphs(chapter.content);
    const paras = normalized.split("\n\n").filter((p) => p.trim());
    let y = margin + 22;

    paras.forEach((para) => {
      const wrapped = doc.splitTextToSize(para, contentW);
      // Check if whole paragraph fits, otherwise start new page first
      if (y + wrapped.length * 4.5 > pageH - margin && y > margin + 22) {
        doc.addPage();
        y = margin;
      }
      wrapped.forEach((line: string) => {
        if (y > pageH - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 4.5;
      });
      y += 3; // paragraph spacing
    });
  });

  doc.save(`${book.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}

export function exportBookToEpub(book: Book) {
  // Build a simple XHTML-based EPUB (ZIP with mimetype + content)
  // Using a minimal approach that works in-browser without heavy deps

  const sanitize = (text: string) =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

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

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${bookId}</dc:identifier>
    <dc:title>${sanitize(book.title)}</dc:title>
    <dc:creator>${sanitize(book.author)}</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().split(".")[0]}Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
${chapterItems}
  </manifest>
  <spine>
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

  const copyrightNotice = `© ${new Date().getFullYear()} The Island of One. All rights reserved. For personal use only.`;

  const chapterFiles = book.chapters.map((ch, i) => ({
    name: `OEBPS/ch${i}.xhtml`,
    content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${sanitize(ch.title)}</title></head>
<body>
  <h1>Chapter ${i + 1}: ${sanitize(ch.title)}</h1>
  ${normalizeParagraphs(ch.content)
    .split("\n\n")
    .filter((p) => p.trim())
    .map((p) => `<p>${sanitize(p)}</p>`)
    .join("\n  ")}
  <hr/>
  <p style="font-size:small;font-style:italic;">${sanitize(copyrightNotice)}</p>
</body>
</html>`,
  }));

  // Build ZIP manually (minimal implementation for EPUB)
  const files: { name: string; content: string; noCompression?: boolean }[] = [
    { name: "mimetype", content: mimetype, noCompression: true },
    { name: "META-INF/container.xml", content: container },
    { name: "OEBPS/content.opf", content: contentOpf },
    { name: "OEBPS/nav.xhtml", content: nav },
    ...chapterFiles,
  ];

  const blob = buildEpubZip(files);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${book.title.replace(/[^a-zA-Z0-9]/g, "_")}.epub`;
  a.click();
  URL.revokeObjectURL(url);
}

// Minimal ZIP builder for EPUB (store-only, no compression needed for small text files)
function buildEpubZip(files: { name: string; content: string; noCompression?: boolean }[]) {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const crc = crc32(contentBytes);

    // Local file header
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true); // version
    lv.setUint16(8, 0, true); // compression: store
    lv.setUint32(14, crc, true);
    lv.setUint32(18, contentBytes.length, true); // compressed
    lv.setUint32(22, contentBytes.length, true); // uncompressed
    lv.setUint16(26, nameBytes.length, true);
    localHeader.set(nameBytes, 30);

    // Central directory entry
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

  // End of central directory
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdOffset, true);

  return new Blob([...parts, ...centralDir, eocd].map(b => new Uint8Array(b.buffer as ArrayBuffer)), { type: "application/epub+zip" });
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
