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
LOCKED PAGE RULE:
PAGE 1: Title only
PAGE 2: Scripture + Illustration together
PAGES 3+: One MAIN POINT per page
FINAL: Closing on one page

If manuscript already has <section class="pdf-page"> wrappers, we keep it.
If manuscript is HTML without wrappers, we auto-wrap using headings MAIN POINT / CLOSING markers.
If manuscript is plain text, we wrap Title + one page (best possible), because true point splitting needs HTML headings.
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

  const page2 = `
<section class="pdf-page scripture-illustration-page">
  <p>${safe}</p>
</section>`.trim();

  return `${page1}\n${page2}`;
}

function buildPagedHtmlFromHtml(title, scriptureRef, html) {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // If already wrapped, use as-is
  const existingPages = doc.querySelectorAll("section.pdf-page");
  if (existingPages.length > 0) return html;

  const bodyNodes = Array.from(doc.body.childNodes).filter((n) => {
    if (n.nodeType === Node.TEXT_NODE) return (n.textContent ?? "").trim().length > 0;
    return true;
  });

  const isHeading = (node) => {
    if (!(node instanceof HTMLElement)) return false;
    const tag = node.tagName.toLowerCase();
    return tag === "h1" || tag === "h2" || tag === "h3";
  };

  const headingText = (node) => {
    if (!(node instanceof HTMLElement)) return "";
    return (node.textContent ?? "").trim().toUpperCase();
  };

  const isMainPointHeading = (node) => isHeading(node) && headingText(node).startsWith("MAIN POINT");
  const isClosingHeading = (node) => {
    if (!isHeading(node)) return false;
    const t = headingText(node);
    return t.startsWith("CLOSING") || t.startsWith("ALTAR CALL") || t.startsWith("INVITATION");
  };

  const mainPointIndexes = [];
  let closingIndex = -1;

  bodyNodes.forEach((n, i) => {
    if (isMainPointHeading(n)) mainPointIndexes.push(i);
    if (closingIndex === -1 && isClosingHeading(n)) closingIndex = i;
  });

  const page1 = `
<section class="pdf-page title-page">
  <div class="title-wrap">
    <h1>${escapeHtml(title)}</h1>
    ${scriptureRef ? `<p class="subtitle">${escapeHtml(scriptureRef)}</p>` : ""}
  </div>
</section>`.trim();

  if (mainPointIndexes.length === 0) {
    const temp = document.createElement("div");
    bodyNodes.forEach((n) => temp.appendChild(n.cloneNode(true)));
    const page2 = `
<section class="pdf-page scripture-illustration-page">
  ${temp.innerHTML}
</section>`.trim();
    return `${page1}\n${page2}`;
  }

  const firstMP = mainPointIndexes[0];
  const beforeMP = bodyNodes.slice(0, firstMP);

  const beforeWrap = document.createElement("div");
  beforeMP.forEach((n) => beforeWrap.appendChild(n.cloneNode(true)));

  const page2 = `
<section class="pdf-page scripture-illustration-page">
  ${beforeWrap.innerHTML}
</section>`.trim();

  const pages = [page1, page2];

  const endForMainPoints = closingIndex !== -1 ? closingIndex : bodyNodes.length;

  for (let i = 0; i < mainPointIndexes.length; i++) {
    const start = mainPointIndexes[i];
    const nextStart = i + 1 < mainPointIndexes.length ? mainPointIndexes[i + 1] : endForMainPoints;

    if (start >= endForMainPoints) break;

    const chunkNodes = bodyNodes.slice(start, nextStart);
    const chunkWrap = document.createElement("div");
    chunkNodes.forEach((n) => chunkWrap.appendChild(n.cloneNode(true)));

    pages.push(
      `
<section class="pdf-page point-page">
  ${chunkWrap.innerHTML}
</section>`.trim(),
    );
  }

  if (closingIndex !== -1) {
    const closingNodes = bodyNodes.slice(closingIndex);
    const closingWrap = document.createElement("div");
    closingNodes.forEach((n) => closingWrap.appendChild(n.cloneNode(true)));

    pages.push(
      `
<section class="pdf-page closing-page">
  ${closingWrap.innerHTML}
</section>`.trim(),
    );
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

  // BUILD-SAFE ref (no generics)
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
    const looksHtml = manuscriptRaw.includes("<") && manuscriptRaw.includes(">");
    if (!looksHtml) return null;
    return DOMPurify.sanitize(manuscriptRaw);
  }, [manuscriptRaw]);

  const pagedHtml = useMemo(() => {
    if (sanitizedHtml) return buildPagedHtmlFromHtml(title, scripture, sanitizedHtml);
    return wrapPlainTextAsHtmlPages(title, scripture, manuscriptRaw);
  }, [sanitizedHtml, manuscriptRaw, title, scripture]);

  const printCss = useMemo(() => {
    return `
@media print {
  @page { size: A4 portrait; margin: 0.75in; }

  .sermon-content .pdf-page {
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
  .sermon-content li {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .sermon-content h1,
  .sermon-content h2,
  .sermon-content h3 {
    page-break-after: avoid;
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
      }
      toast.success("Download started!");
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Download failed. Please try again.");
    }
  }

  // BUILD-SAFE clipboard copy
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
  font-size: 26px;
  line-height: 1.15;
  margin: 18px 0 12px 0;
}
.sermon-content p{
  font-size: 18px;
  line-height: 1.6;
  margin: 0 0 12px 0;
}

/* Main point page heading big bold */
.sermon-content .point-page h2,
.sermon-content .point-page h3{
  font-size: 30px;
  line-height: 1.1;
  margin: 0 0 14px 0;
  font-weight: 800;
}

.sermon-content ul{
  margin: 0;
  padding-left: 24px;
}
.sermon-content li{
  font-size: 20px;
  line-height: 1.5;
  margin: 0 0 12px 0;
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
