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

function safeText(v: any) {
  return String(v ?? "").trim();
}

function safeMoney(v: any) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function escapeHtml(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/*
Build-safe locked paging (no DOMParser, no Node/HTMLElement).
Rules:
- If sermon content already contains <section class="pdf-page"> wrappers, we use it as-is.
- Otherwise we generate:
  PAGE 1: Title only
  PAGE 2: Scripture + Illustration + rest (until you store wrappers in the sermon content)
*/
function buildLockedPages(args: {
  title: string;
  scriptureRef: string;
  rawText: string;
  sanitizedHtml: string | null;
}) {
  const { title, scriptureRef, rawText, sanitizedHtml } = args;

  const alreadyWrapped = typeof sanitizedHtml === "string" && sanitizedHtml.includes('class="pdf-page"');

  if (alreadyWrapped) return sanitizedHtml as string;

  const page1 = `
<section class="pdf-page title-page">
  <div class="title-wrap">
    <h1>${escapeHtml(title)}</h1>
    ${scriptureRef ? `<p class="subtitle">${escapeHtml(scriptureRef)}</p>` : ""}
  </div>
</section>`.trim();

  const bodyHtml = sanitizedHtml
    ? sanitizedHtml
    : `<p>${escapeHtml(rawText)
        .replace(/\n{2,}/g, "\n\n")
        .replace(/\n/g, "<br/>")}</p>`;

  const page2 = `
<section class="pdf-page scripture-illustration-page">
  ${bodyHtml}
</section>`.trim();

  return `${page1}\n${page2}`;
}

export default function SermonDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const navigate = useNavigate();

  // Important: always pass a string to the hook
  const { data: sermon, isLoading } = useSermon(id);

  // Cast auth to any so TS doesn’t block build if your context types differ
  const auth: any = useAuth();
  const user = auth?.user ?? null;
  const isSubscribed = Boolean(auth?.isSubscribed);
  const checkPurchase = auth?.checkPurchase; // may be undefined or different signature

  const [purchased, setPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Build-safe ref (no TS generic)
  const sermonRef = useRef<any>(null);

  // Normalize sermon fields
  const title = safeText((sermon as any)?.title) || "Sermon";
  const scripture = safeText((sermon as any)?.scripture);
  const excerpt = safeText((sermon as any)?.excerpt ?? (sermon as any)?.summary);
  const manuscriptRaw = safeText(
    (sermon as any)?.manuscript ??
      (sermon as any)?.content ??
      (sermon as any)?.content_html ??
      (sermon as any)?.body ??
      "",
  );

  const isFreeFlag = Boolean((sermon as any)?.is_free === true);
  const accessLevel = safeText((sermon as any)?.access_level || "free");
  const chargeEnabled = Boolean((sermon as any)?.charge_enabled ?? (sermon as any)?.charge_for_sermon ?? false);
  const price = safeMoney((sermon as any)?.price);

  // Decide if this sermon is locked
  const isLocked = useMemo(() => {
    if (isFreeFlag || accessLevel === "free") return false;
    if (price > 0 || chargeEnabled) return true;
    return accessLevel !== "free";
  }, [isFreeFlag, accessLevel, price, chargeEnabled]);

  // Check purchase status (best-effort)
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
        // Support BOTH signatures:
        // 1) checkPurchase("sermon", id)
        // 2) checkPurchase(id)
        let result: any;
        try {
          result = await (checkPurchase as any)("sermon", id);
        } catch {
          result = await (checkPurchase as any)(id);
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

  // Locked paging HTML for website + print PDF (build safe)
  const pagedHtml = useMemo(() => {
    return buildLockedPages({
      title,
      scriptureRef: scripture,
      rawText: manuscriptRaw,
      sanitizedHtml,
    });
  }, [title, scripture, manuscriptRaw, sanitizedHtml]);

  async function handlePurchase() {
    if (!id) return;

    if (!user) {
      navigate("/auth", { state: { from: `/sermons/${id}` } });
      return;
    }

    setCheckoutLoading(true);
    try {
      // Use any-cast to avoid TS typing build failures
      const fn: any = (supabase as any).functions;

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
    } catch (err: any) {
      toast.error(err?.message || "Failed to start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  }

  // DOWNLOADS: use client-side export functions
  async function handleDownload(kind: "pdf" | "epub" | "word" | "goodnotes") {
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

          {/* DOWNLOAD BUTTONS (RESTORED) */}
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
            {/* PRINT + PDF LOCKING (SERMON ONLY) */}
            <style>{`
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
}
            `}</style>

            {/* GoodNotes big fonts + page cards on screen */}
            <style>{`
.sermon-content .pdf-page{
  page-break-after: always;
  break-after: page;
  page-break-inside: avoid;
  break-inside: avoid-page;
}

@media screen{
  .sermon-content .pdf-page{
    padding: 34px;
    margin: 18px 0;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 12px;
    background: rgba(0,0,0,0.15);
  }
}

.sermon-content h1{ font-size:44px; line-height:1.05; margin:0 0 14px 0; }
.sermon-content h2{ font-size:26px; line-height:1.15; margin:18px 0 12px 0; }
.sermon-content p{ font-size:18px; line-height:1.6; margin:0 0 12px 0; }

.sermon-content ul{ margin:0; padding-left:24px; }
.sermon-content li{ font-size:20px; line-height:1.5; margin:0 0 12px 0; }

.sermon-content .title-page .title-wrap{ text-align:center; padding-top:40px; }
.sermon-content .title-page .subtitle{ font-size:20px; opacity:0.85; }
            `}</style>

            <div className="prose prose-invert max-w-none">
              <article className="sermon-content" ref={sermonRef}>
                <div dangerouslySetInnerHTML={{ __html: pagedHtml }} />
              </article>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
