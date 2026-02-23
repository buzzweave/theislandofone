import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { toast } from "sonner";

import { useSermon } from "@/hooks/useSermons";
import {
  exportSermonToPdf,
  exportSermonToEpub,
  exportSermonToWord,
  exportSermonToGoodNotesPdf,
} from "@/lib/sermonExport";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import {
  ArrowLeft,
  Lock,
  Eye,
  ShoppingCart,
  Crown,
  Loader2,
  Download,
  BookOpen,
  File,
  NotebookPen,
} from "lucide-react";

function safeText(v) {
  return String(v ?? "").trim();
}

function safeMoney(v) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/* BUILD-SAFE (no replaceAll) */
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/*
LOCKED PAGE RULE (GoodNotes/PDF/Word):
PAGE 1: Title only
PAGE 2: Scripture section only (if SCRIPTURE heading exists)
PAGE 3: Illustration section only (if ILLUSTRATION heading exists)
PAGES 4+: MAIN POINTS
  - One MAIN POINT per page
  - If a MAIN POINT has more than 5 bullets, split into extra pages of 5 bullets each (same MAIN POINT heading repeated)
FINAL: Closing/Altar Call page (if present)

If manuscript already has <section class="pdf-page"> wrappers, keep as-is.
If manuscript is HTML without wrappers, auto-wrap using headings.
If manuscript is plain text, wrap Title + one content page (best possible).
*/
function wrapPlainTextAsHtmlPages(title, scriptureRef, raw) {
  const safe = escapeHtml(raw)
    .replace(/\n{2,}/g, "\n\n")
    .replace(/\n/g, "<br/>");

  const page1 = `
<section class="pdf-page title-page">
  <div class="title-wrap">
    <h1>${escapeHtml(title)}</h1>
    ${scriptureRef ? `<p class="subtitle">${escapeHtml(scriptureRef)}</p>` : ""}
  </div>
</section>`.trim();

  // Plain text: best effort (cannot reliably split Scripture/Illustration/Main Points)
  const page2 = `
<section class="pdf-page body-page">
  <p>${safe}</p>
</section>`.trim();

  return `${page1}\n${page2}`;
}

function buildPagedHtmlFromHtml(title, scriptureRef, html) {
  // Build-safe for environments that might pre-render
  if (typeof window === "undefined") {
    return wrapPlainTextAsHtmlPages(title, scriptureRef, html);
  }

  const doc = new DOMParser().parseFromString(html, "text/html");

  // If already wrapped, use as-is
  const existingPages = doc.querySelectorAll("section.pdf-page");
  if (existingPages.length > 0) return html;

  const bodyNodes = Array.from(doc.body.childNodes).filter((n) => {
    const isText = n && n.nodeType === 3; // TEXT_NODE
    if (isText) return (n.textContent ?? "").trim().length > 0;
    return true;
  });

  const isHeading = (node) => {
    if (!node || !node.tagName) return false;
    const tag = String(node.tagName).toLowerCase();
    return tag === "h1" || tag === "h2" || tag === "h3";
  };

  const headingText = (node) =>
    String(node?.textContent ?? "")
      .trim()
      .toUpperCase();

  const isMainPointHeading = (node) => isHeading(node) && headingText(node).startsWith("MAIN POINT");
  const isClosingHeading = (node) => {
    if (!isHeading(node)) return false;
    const t = headingText(node);
    return t.startsWith("CLOSING") || t.startsWith("ALTAR CALL") || t.startsWith("INVITATION");
  };
  const isScriptureHeading = (node) => {
    if (!isHeading(node)) return false;
    const t = headingText(node);
    return t === "SCRIPTURE" || t.startsWith("SCRIPTURE");
  };
  const isIllustrationHeading = (node) => {
    if (!isHeading(node)) return false;
    const t = headingText(node);
    return t === "ILLUSTRATION" || t.startsWith("OPENING ILLUSTRATION") || t.startsWith("ILLUSTRATION");
  };

  const findFirstIndex = (pred) => bodyNodes.findIndex((n) => pred(n));

  const scriptureIndex = findFirstIndex(isScriptureHeading);
  const illustrationIndex = findFirstIndex(isIllustrationHeading);

  const mainPointIndexes = [];
  let closingIndex = -1;

  bodyNodes.forEach((n, i) => {
    if (isMainPointHeading(n)) mainPointIndexes.push(i);
    if (closingIndex === -1 && isClosingHeading(n)) closingIndex = i;
  });

  const firstMP = mainPointIndexes.length > 0 ? mainPointIndexes[0] : -1;
  const endBeforeMainPoints = firstMP !== -1 ? firstMP : closingIndex !== -1 ? closingIndex : bodyNodes.length;

  const page1 = `
<section class="pdf-page title-page">
  <div class="title-wrap">
    <h1>${escapeHtml(title)}</h1>
    ${scriptureRef ? `<p class="subtitle">${escapeHtml(scriptureRef)}</p>` : ""}
  </div>
</section>`.trim();

  const pages = [page1];

  const wrapRangeAsPage = (start, end, className) => {
    const wrap = doc.createElement("div");
    bodyNodes.slice(start, end).forEach((n) => wrap.appendChild(n.cloneNode(true)));
    return `
<section class="pdf-page ${className}">
  ${wrap.innerHTML}
</section>`.trim();
  };

  const hasScripture = scriptureIndex !== -1 && scriptureIndex < endBeforeMainPoints;
  const hasIllustration = illustrationIndex !== -1 && illustrationIndex < endBeforeMainPoints;

  // PAGE 2: Scripture, PAGE 3: Illustration (when headings exist)
  if (hasScripture && hasIllustration) {
    const sStart = scriptureIndex;
    const sEnd = illustrationIndex > scriptureIndex ? illustrationIndex : endBeforeMainPoints;
    const iStart = illustrationIndex;
    const iEnd = endBeforeMainPoints;

    pages.push(wrapRangeAsPage(sStart, sEnd, "scripture-page"));
    pages.push(wrapRangeAsPage(iStart, iEnd, "illustration-page"));
  } else if (hasScripture && !hasIllustration) {
    pages.push(wrapRangeAsPage(scriptureIndex, endBeforeMainPoints, "scripture-page"));
  } else if (!hasScripture && hasIllustration) {
    if (illustrationIndex > 0) pages.push(wrapRangeAsPage(0, illustrationIndex, "scripture-page"));
    pages.push(wrapRangeAsPage(illustrationIndex, endBeforeMainPoints, "illustration-page"));
  } else {
    // Fallback: everything before MAIN POINT becomes Scripture page
    if (endBeforeMainPoints > 0) pages.push(wrapRangeAsPage(0, endBeforeMainPoints, "scripture-page"));
  }

  // MAIN POINT pages: split bullets into groups of 5
  const endForMainPoints = closingIndex !== -1 ? closingIndex : bodyNodes.length;

  const buildPointPages = (nodes) => {
    const container = doc.createElement("div");
    nodes.forEach((n) => container.appendChild(n.cloneNode(true)));

    const listEl = container.querySelector("ul,ol");
    const headingEl = Array.from(container.children).find((el) => {
      const tag = String(el.tagName || "").toLowerCase();
      return tag === "h1" || tag === "h2" || tag === "h3";
    });

    // No list => one page
    if (!listEl) {
      return [
        `
<section class="pdf-page point-page">
  ${container.innerHTML}
</section>`.trim(),
      ];
    }

    const liEls = Array.from(listEl.querySelectorAll(":scope > li"));
    const groups = [];
    for (let i = 0; i < liEls.length; i += 5) groups.push(liEls.slice(i, i + 5));

    // Preface = everything except the big list (kept on first bullet page only)
    const preface = doc.createElement("div");
    Array.from(container.childNodes).forEach((child) => {
      if (child && child.nodeType === 1) {
        const tag = String(child.tagName || "").toLowerCase();
        if ((tag === "ul" || tag === "ol") && child === listEl) return;
      }
      preface.appendChild(child.cloneNode(true));
    });

    const listTag = String(listEl.tagName || "ul").toLowerCase();

    return groups.map((group, idx) => {
      const pageWrap = doc.createElement("div");

      if (idx === 0) {
        pageWrap.innerHTML = preface.innerHTML;
      } else if (headingEl) {
        pageWrap.appendChild(headingEl.cloneNode(true));
      }

      const newList = doc.createElement(listTag);
      group.forEach((li) => newList.appendChild(li.cloneNode(true)));
      pageWrap.appendChild(newList);

      return `
<section class="pdf-page point-page">
  ${pageWrap.innerHTML}
</section>`.trim();
    });
  };

  for (let i = 0; i < mainPointIndexes.length; i++) {
    const start = mainPointIndexes[i];
    const nextStart = i + 1 < mainPointIndexes.length ? mainPointIndexes[i + 1] : endForMainPoints;
    if (start >= endForMainPoints) break;

    const chunkNodes = bodyNodes.slice(start, nextStart);
    const pointPages = buildPointPages(chunkNodes);
    pointPages.forEach((p) => pages.push(p));
  }

  // Closing page
  if (closingIndex !== -1) {
    pages.push(wrapRangeAsPage(closingIndex, bodyNodes.length, "closing-page"));
  }

  return pages.join("\n");
}

export default function SermonDetail() {
  const params = useParams();
  const id = params.id ?? "";
  const navigate = useNavigate();

  const { data: sermon, isLoading } = useSermon(id);

  const auth = useAuth();
  const user = auth?.user ?? null;
  const isSubscribed = Boolean(auth?.isSubscribed);
  const checkPurchase = auth?.checkPurchase;

  const [purchased, setPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const sermonRef = useRef(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyHtml, setCopyHtml] = useState("");

  const title = safeText(sermon?.title) || "Sermon";
  const scripture = safeText(sermon?.scripture);
  const excerpt = safeText(sermon?.excerpt ?? sermon?.summary);
  const manuscriptRaw = safeText(sermon?.manuscript ?? sermon?.content ?? sermon?.content_html ?? sermon?.body ?? "");

  const isFreeFlag = Boolean(sermon?.is_free === true);
  const accessLevel = safeText(sermon?.access_level || "free");
  const chargeEnabled = Boolean(sermon?.charge_enabled ?? sermon?.charge_for_sermon ?? false);
  const price = safeMoney(sermon?.price);

  const isLocked = useMemo(() => {
    if (isFreeFlag || accessLevel === "free") return false;
    if (price > 0 || chargeEnabled) return true;
    return accessLevel !== "free";
  }, [isFreeFlag, accessLevel, price, chargeEnabled]);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!isLocked) {
        if (alive) setPurchased(false);
        return;
      }
      if (!user || !id) {
        if (alive) setPurchased(false);
        return;
      }
      if (typeof checkPurchase !== "function") {
        if (alive) setPurchased(false);
        return;
      }

      setCheckingPurchase(true);

      try {
        let result;
        try {
          result = await checkPurchase("sermon", id);
        } catch {
          result = await checkPurchase(id);
        }
        if (alive) setPurchased(Boolean(result));
      } catch {
        if (alive) setPurchased(false);
      } finally {
        if (alive) setCheckingPurchase(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [user, id, isLocked, checkPurchase]);

  const isFullAccess = useMemo(() => {
    if (!isLocked) return true;
    if (!user) return false;
    if (purchased) return true;
    if (isSubscribed) return true;
    return false;
  }, [isLocked, user, purchased, isSubscribed]);

  const sanitizedHtml = useMemo(() => {
    // Build-safe
    if (typeof window === "undefined") return null;

    const looksHtml = manuscriptRaw.includes("<") && manuscriptRaw.includes(">");
    if (!looksHtml) return null;

    // DOMPurify is safe in browser; we keep it guarded for build
    try {
      return DOMPurify.sanitize(manuscriptRaw);
    } catch {
      return null;
    }
  }, [manuscriptRaw]);

  const pagedHtml = useMemo(() => {
    if (sanitizedHtml) return buildPagedHtmlFromHtml(title, scripture, sanitizedHtml);
    return wrapPlainTextAsHtmlPages(title, scripture, manuscriptRaw);
  }, [sanitizedHtml, manuscriptRaw, title, scripture]);

  const printCss = useMemo(() => {
    return `
@media print {
  @page { size: A4 portrait; margin: 0.75in; }

  /* Fill printable area so each wrapper becomes one “real page” */
  .sermon-content .pdf-page{
    /* 11.69in - 1.5in margins = 10.19in usable height */
    min-height: 10.19in;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;

    page-break-after: always;
    break-after: page;
    page-break-inside: avoid;
    break-inside: avoid-page;
  }

  .sermon-content h1,
  .sermon-content h2,
  .sermon-content h3,
  .sermon-content p,
  .sermon-content ul,
  .sermon-content ol,
  .sermon-content li {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .sermon-content h1,
  .sermon-content h2,
  .sermon-content h3 {
    page-break-after: avoid;
  }

  .sermon-content ul,
  .sermon-content ol {
    orphans: 99;
    widows: 99;
  }

  .sermon-ui { display: none !important; }
}
    `.trim();
  }, []);

  async function handlePurchase() {
    if (!id) return;

    if (!user) {
      navigate("/auth", { state: { from: `/sermons/${id}` } });
      return;
    }

    setCheckoutLoading(true);
    try {
      const fn = supabase.functions;

      const { data, error } = await fn.invoke("create-checkout", {
        body: {
          type: "sermon",
          itemId: id,
          priceAmount: price,
          itemTitle: title,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      toast.error("Checkout URL not returned.");
    } catch (err) {
      toast.error(err?.message || "Failed to start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleDownload(kind) {
    if (!sermon) return;

    if (!isFullAccess) {
      toast.error("Please unlock this sermon to download.");
      return;
    }

    try {
      switch (kind) {
        case "pdf":
          exportSermonToPdf(sermon);
          break;
        case "epub":
          exportSermonToEpub(sermon);
          break;
        case "word":
          exportSermonToWord(sermon);
          break;
        case "goodnotes":
          await exportSermonToGoodNotesPdf(sermon);
          break;
        default:
          break;
      }
      toast.success("Download started!");
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Download failed. Please try again.");
    }
  }

  async function handleCopyForGoodNotes() {
    const root = sermonRef.current;
    if (!root) return;

    const html = root.innerHTML;
    setCopyHtml(html);
    setCopyOpen(true);

    try {
      const ClipboardItemAny = window?.ClipboardItem;
      if (ClipboardItemAny) {
        const blob = new Blob([html], { type: "text/html" });
        const item = new ClipboardItemAny({ "text/html": blob });
        await navigator.clipboard.write([item]);
      } else {
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        await navigator.clipboard.writeText(tmp.innerText);
      }
      toast.success("Copied for GoodNotes!");
    } catch {
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      try {
        await navigator.clipboard.writeText(tmp.innerText);
      } catch {}
      toast.success("Copied (fallback)!");
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading sermon…</div>;
  }

  if (!sermon) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Sermon not found.</div>;
  }

  const showPaywall = isLocked && !isFullAccess;

  return (
    <div className="min-h-screen py-10">
      <div className="container mx-auto px-4 max-w-3xl">
        <button
          onClick={() => navigate("/sermons")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Sermons
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            {isLocked ? (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <Lock className="h-3 w-3" />
                {price > 0 ? `$${price.toFixed(2)}` : "Members"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/5 text-primary/70 border border-primary/10">
                <Eye className="h-3 w-3" />
                Free
              </span>
            )}

            {checkingPurchase ? (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking access…
              </span>
            ) : null}
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-bold mb-2">{title}</h1>
          {scripture ? <p className="text-sm text-primary/80">{scripture}</p> : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleDownload("pdf")}
              disabled={!isFullAccess}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-semibold ${
                !isFullAccess
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground"
              }`}
              title={!isFullAccess ? "Unlock to download" : "Download PDF"}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>

            <button
              onClick={() => handleDownload("epub")}
              disabled={!isFullAccess}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border font-semibold ${
                !isFullAccess ? "border-border text-muted-foreground cursor-not-allowed" : "border-primary/30"
              }`}
              title={!isFullAccess ? "Unlock to download" : "Download EPUB"}
            >
              <BookOpen className="h-4 w-4" />
              Download EPUB
            </button>

            <button
              onClick={() => handleDownload("word")}
              disabled={!isFullAccess}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border font-semibold ${
                !isFullAccess ? "border-border text-muted-foreground cursor-not-allowed" : "border-primary/30"
              }`}
              title={!isFullAccess ? "Unlock to download" : "Download Word"}
            >
              <File className="h-4 w-4" />
              Download Word
            </button>

            <button
              onClick={() => handleDownload("goodnotes")}
              disabled={!isFullAccess}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border font-semibold ${
                !isFullAccess ? "border-border text-muted-foreground cursor-not-allowed" : "border-primary/30"
              }`}
              title={!isFullAccess ? "Unlock to download" : "Download GoodNotes"}
            >
              <NotebookPen className="h-4 w-4" />
              Download GoodNotes
            </button>

            {isFullAccess ? (
              <button
                onClick={handleCopyForGoodNotes}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border font-semibold border-primary/30"
                title="Copy paged sermon for GoodNotes"
              >
                <NotebookPen className="h-4 w-4" />
                Copy for GoodNotes
              </button>
            ) : null}
          </div>

          <div className="mt-2 text-xs text-muted-foreground">
            {!isFullAccess ? "Unlock this sermon to enable downloads." : null}
          </div>
        </div>

        {showPaywall ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <p className="text-sm text-muted-foreground mb-4">
              {excerpt || "This sermon is available to members. Purchase or join to unlock the full manuscript."}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handlePurchase}
                disabled={checkoutLoading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold"
              >
                {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                Buy for ${price.toFixed(2)}
              </button>

              <Link
                to="/membership"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-primary/30 font-semibold"
              >
                <Crown className="h-4 w-4" />
                Join Membership
              </Link>

              {!user ? (
                <Link
                  to="/auth"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-border font-semibold"
                >
                  Sign In
                </Link>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              After payment, return here and refresh. It will unlock automatically.
            </p>
          </div>
        ) : (
          <>
            <style>{printCss}</style>

            <style>{`
/* Each wrapper becomes a page */
.sermon-content .pdf-page{
  page-break-after: always;
  break-after: page;
  page-break-inside: avoid;
  break-inside: avoid-page;
}

/* Web view page cards */
@media screen{
  .sermon-content .pdf-page{
    padding: 34px;
    margin: 18px 0;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 12px;
    background: rgba(0,0,0,0.15);
  }
}

/* GoodNotes big fonts */
.sermon-content h1{
  font-size: 44px;
  line-height: 1.05;
  margin: 0 0 14px 0;
}
.sermon-content h2{
  font-size: 28px;
  line-height: 1.15;
  margin: 18px 0 12px 0;
}
.sermon-content h3{
  font-size: 26px;
  line-height: 1.15;
  margin: 18px 0 12px 0;
}
.sermon-content p{
  font-size: 19px;
  line-height: 1.65;
  margin: 0 0 12px 0;
}

.sermon-content ul,
.sermon-content ol{
  margin: 0;
  padding-left: 26px;
}
.sermon-content li{
  font-size: 21px;
  line-height: 1.55;
  margin: 0 0 12px 0;
}

/* Main point page heading big bold */
.sermon-content .point-page h2,
.sermon-content .point-page h3{
  font-size: 32px;
  line-height: 1.08;
  margin: 0 0 14px 0;
  font-weight: 800;
}

/* Title page alignment */
.sermon-content .title-page .title-wrap{
  text-align: center;
  padding-top: 40px;
}
.sermon-content .title-page .subtitle{
  font-size: 20px;
  opacity: 0.85;
}
            `}</style>

            <div className="prose prose-invert max-w-none">
              <article className="sermon-content" ref={sermonRef}>
                <div dangerouslySetInnerHTML={{ __html: pagedHtml }} />
              </article>
            </div>

            {copyOpen ? (
              <div
                className="sermon-ui"
                onClick={() => setCopyOpen(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 18,
                  zIndex: 9999,
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: "min(900px, 95vw)",
                    maxHeight: "85vh",
                    overflow: "auto",
                    background: "#0b0b0b",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">Copy Preview (already copied)</div>
                    <button
                      onClick={() => setCopyOpen(false)}
                      className="px-4 py-2 rounded-full border border-border font-semibold"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-4" dangerouslySetInnerHTML={{ __html: copyHtml }} />
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
