import { jsPDF } from "jspdf";
import { buildEpubZip } from "@/lib/bookExport";
import { triggerDownload } from "@/lib/downloadHelper";
import { COPYRIGHT } from "@/lib/pulpitFormat";
import type { Sermon } from "@/hooks/useSermons";

const safeTitle = (title: string) => title.replace(/[^a-zA-Z0-9]/g, "_");

// ── Shared helpers ──────────────────────────────────────────────────────

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

/** Parse HTML into styled segments for jsPDF rendering */
interface TextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  heading: number; // 0 = body, 1-6 = heading level
}

function parseHtmlToSegments(html: string): TextSegment[][] {
  // Split by block-level elements into paragraphs
  const blocks: string[] = [];
  
  // Normalize: replace block-level closing tags with markers
  let processed = html
    .replace(/<\/h([1-6])>/gi, (_, n) => `\n__BLOCK_END_H${n}__\n`)
    .replace(/<h([1-6])[^>]*>/gi, (_, n) => `\n__BLOCK_START_H${n}__\n`)
    .replace(/<\/p>/gi, "\n__BLOCK_END__\n")
    .replace(/<p[^>]*>/gi, "\n__BLOCK_START__\n")
    .replace(/<br\s*\/?>/gi, "\n__LINEBREAK__\n")
    .replace(/<\/li>/gi, "\n__BLOCK_END__\n")
    .replace(/<li[^>]*>/gi, "\n__BULLET__\n")
    .replace(/<\/?(?:ul|ol)[^>]*>/gi, "");

  // Now parse segments within each block
  const lines = processed.split("\n").filter(l => l.trim());
  const paragraphs: TextSegment[][] = [];
  let currentHeading = 0;
  let isBullet = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.match(/^__BLOCK_START_H(\d)__$/)) {
      currentHeading = parseInt(trimmed.match(/(\d)/)?.[1] || "0");
      continue;
    }
    if (trimmed.match(/^__BLOCK_END_H\d__$/)) {
      currentHeading = 0;
      continue;
    }
    if (trimmed === "__BLOCK_START__") continue;
    if (trimmed === "__BLOCK_END__") continue;
    if (trimmed === "__LINEBREAK__") {
      paragraphs.push([{ text: "", bold: false, italic: false, heading: 0 }]);
      continue;
    }
    if (trimmed === "__BULLET__") {
      isBullet = true;
      continue;
    }

    // Parse inline formatting (bold/italic)
    const segments: TextSegment[] = [];
    let remaining = trimmed;
    
    // Add bullet prefix if needed
    if (isBullet) {
      remaining = "• " + remaining;
      isBullet = false;
    }

    // Simple regex-based inline parsing
    const inlineRegex = /<(strong|b|em|i)(?:\s[^>]*)?>|<\/(strong|b|em|i)>/gi;
    let bold = false;
    let italic = false;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = inlineRegex.exec(remaining)) !== null) {
      // Text before this tag
      if (match.index > lastIndex) {
        const text = stripInlineTags(remaining.slice(lastIndex, match.index));
        if (text) segments.push({ text, bold, italic, heading: currentHeading });
      }
      
      const tag = (match[1] || match[2]).toLowerCase();
      if (match[1]) {
        // Opening tag
        if (tag === "strong" || tag === "b") bold = true;
        if (tag === "em" || tag === "i") italic = true;
      } else {
        // Closing tag
        if (tag === "strong" || tag === "b") bold = false;
        if (tag === "em" || tag === "i") italic = false;
      }
      lastIndex = match.index + match[0].length;
    }

    // Remaining text after last tag
    if (lastIndex < remaining.length) {
      const text = stripInlineTags(remaining.slice(lastIndex));
      if (text) segments.push({ text, bold, italic, heading: currentHeading });
    }

    if (segments.length === 0 && remaining.trim()) {
      const text = stripInlineTags(remaining);
      if (text) segments.push({ text, bold: false, italic: false, heading: currentHeading });
    }

    if (segments.length > 0) {
      paragraphs.push(segments);
    }
  }

  return paragraphs;
}

function stripInlineTags(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// ─── PDF — 3-Page Preach Ready Layout (Landscape A4) ───────────────────

export function exportSermonToPdf(sermon: Sermon) {
  const doc = new jsPDF({ unit: "pt", format: [842, 595], orientation: "landscape" });
  const pageW = 842;
  const pageH = 595;
  const margin = 56;
  const contentW = pageW - margin * 2;

  const title = sermon.title || "";
  const scripture = sermon.scripture || "";
  const manuscript = sermon.manuscript || "";

  // Parse structure: detect bold headings as main points
  const boldSegments = manuscript.includes("<") ? extractBoldSegmentsFromHtml(manuscript) : new Set<string>();
  const raw = normalizeParagraphs(manuscript);
  const lines = raw.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  const titleNorm = title.trim().toLowerCase();
  const scriptureNorm = scripture.trim().toLowerCase();

  interface MainPoint { heading: string; bullets: string[]; }
  const mainPoints: MainPoint[] = [];
  const illustrations: string[] = [];
  let current: MainPoint | null = null;

  for (const line of lines) {
    const lineNorm = line.toLowerCase();
    if (lineNorm === titleNorm || (scriptureNorm && lineNorm === scriptureNorm)) continue;

    const isBoldHeading = [...boldSegments].some(
      b => b.toLowerCase() === lineNorm || lineNorm.startsWith(b.toLowerCase())
    );

    if (isBoldHeading) {
      current = { heading: line, bullets: [] };
      mainPoints.push(current);
    } else if (current) {
      current.bullets.push(line);
    } else {
      illustrations.push(line);
    }
  }

  // Illustrations = only non-heading, non-main-point body text (before any bold heading)
  // Main point bullets stay with their headings and are NOT duplicated into illustrations

  /* ─── PAGE 1: Title + Scripture ─────────────────────────────────── */
  doc.setFont("times", "bold");
  doc.setFontSize(44);
  const titleLines: string[] = doc.splitTextToSize(title, contentW);
  const titleBlockH = titleLines.length * 52;
  let titleY = (pageH / 2) - (titleBlockH / 2) - 30;
  if (titleY < margin) titleY = margin;

  for (const tl of titleLines) {
    doc.text(tl, pageW / 2, titleY, { align: "center" });
    titleY += 52;
  }

  if (scripture) {
    doc.setFont("times", "italic");
    doc.setFontSize(22);
    const scriptureLines: string[] = doc.splitTextToSize(scripture, contentW);
    let sY = titleY + 30;
    for (const sl of scriptureLines) {
      doc.text(sl, pageW / 2, sY, { align: "center" });
      sY += 28;
    }
  }

  /* ─── PAGE 2+: Main Points (numbered, each heading bold) ───────── */
  if (mainPoints.length > 0) {
    doc.addPage([842, 595]);
    let y = margin;

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("MAIN POINTS", pageW / 2, y, { align: "center" });
    y += 36;

    for (let i = 0; i < mainPoints.length; i++) {
      const mp = mainPoints[i];
      if (y + 60 > pageH - margin) { doc.addPage([842, 595]); y = margin; }

      // Numbered heading in bold
      doc.setFont("times", "bold");
      doc.setFontSize(18);
      const headingText = `${i + 1}. ${mp.heading}`;
      const headingLines: string[] = doc.splitTextToSize(headingText, contentW - 20);
      for (const hl of headingLines) {
        if (y + 24 > pageH - margin) { doc.addPage([842, 595]); y = margin; }
        doc.text(hl, margin + 10, y);
        y += 24;
      }
      y += 8;

      // Bullets in regular font
      doc.setFont("times", "normal");
      doc.setFontSize(14);
      for (const bullet of mp.bullets) {
        const bulletText = `• ${bullet}`;
        const bulletLines: string[] = doc.splitTextToSize(bulletText, contentW - 40);
        for (const bl of bulletLines) {
          if (y + 20 > pageH - margin) { doc.addPage([842, 595]); y = margin; }
          doc.text(bl, margin + 30, y);
          y += 20;
        }
        y += 4;
      }
      y += 16;
    }
  }

  /* ─── PAGE 3+: Illustrations & Notes (intro text only) ─────────── */
  if (illustrations.length > 0) {
    doc.addPage([842, 595]);
    let y = margin;

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("ILLUSTRATIONS & NOTES", pageW / 2, y, { align: "center" });
    y += 36;

    doc.setFont("times", "normal");
    doc.setFontSize(13);
    const lineHeight = 20;

    for (const para of illustrations) {
      const wrapped: string[] = doc.splitTextToSize(para, contentW);
      for (const wl of wrapped) {
        if (y + lineHeight > pageH - margin) { doc.addPage([842, 595]); y = margin; }
        doc.text(wl, margin, y);
        y += lineHeight;
      }
      y += 8;
    }
  }

  // Copyright on last page
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text(COPYRIGHT(), pageW / 2, pageH - 30, { align: "center" });

  const pdfBlob = doc.output("blob");
  triggerDownload(pdfBlob, `${safeTitle(sermon.title)}.pdf`);
}

/** Extract bold text segments from HTML for main point detection */
function extractBoldSegmentsFromHtml(html: string): Set<string> {
  const bolds = new Set<string>();
  const re = /<(?:strong|b)(?:\s[^>]*)?>(.+?)<\/(?:strong|b)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").trim();
    if (text.length > 0) bolds.add(text);
  }
  return bolds;
}

function findOverlap(line: string, segText: string): string {
  // Find the longest prefix of segText that matches the start of line
  const maxLen = Math.min(line.length, segText.length);
  for (let i = maxLen; i > 0; i--) {
    if (line.substring(0, i) === segText.substring(0, i)) {
      return line.substring(0, i);
    }
  }
  return "";
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

// ─── GoodNotes PDF (server-side, iPad-safe) ─────────────────────────────

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

// ─── Word (.doc) — WYSIWYG from Rich Editor ────────────────────────────

export function exportSermonToWord(sermon: Sermon) {
  // Pass the manuscript HTML directly — preserves all formatting from the editor
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${sermon.title}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  @page { size: A4 portrait; margin: 1in; }
  body { font-family: Georgia, "Times New Roman", serif; margin: 1in; color: #000; line-height: 1.7; font-size: 13pt; }
  h1 { font-size: 28pt; font-weight: bold; text-align: center; margin-bottom: 1.5em; }
  h2 { font-size: 16pt; font-weight: bold; margin-top: 2em; margin-bottom: 0.6em; }
  h3 { font-size: 14pt; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em; }
  p { margin-bottom: 1.1em; }
  ul, ol { font-size: 12pt; line-height: 1.6; margin-left: 0.3in; margin-top: 1em; margin-bottom: 1.5em; }
  li { margin-bottom: 0.6em; }
  strong, b { font-weight: bold; }
  em, i { font-style: italic; }
  .copyright { font-size: 9pt; font-style: italic; color: #999; text-align: center; margin-top: 2in; border-top: 1px solid #ddd; padding-top: 0.5in; }
</style></head>
<body>
${sermon.manuscript}
  <p class="copyright">${COPYRIGHT()}</p>
</body></html>`;

  const blob = new Blob([html], { type: "application/msword" });
  triggerDownload(blob, `${safeTitle(sermon.title)}.doc`);
}
