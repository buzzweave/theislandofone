import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { toast } from "sonner";

import { useSermon } from "@/hooks/useSermons";
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
  FileText,
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

function openFile(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
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

  // Download links (supports multiple possible field names so it "just works")
  const pdfUrl = safeText((sermon as any)?.pdf_url ?? (sermon as any)?.pdf ?? (sermon as any)?.pdfUrl ?? "");
  const epubUrl = safeText((sermon as any)?.epub_url ?? (sermon as any)?.epub ?? (sermon as any)?.epubUrl ?? "");
  const wordUrl = safeText(
    (sermon as any)?.docx_url ??
      (sermon as any)?.word_url ??
      (sermon as any)?.doc_url ??
      (sermon as any)?.docx ??
      (sermon as any)?.word ??
      (sermon as any)?.docxUrl ??
      "",
  );
  const goodnotesUrl = safeText(
    (sermon as any)?.goodnotes_url ??
      (sermon as any)?.goodnotes ??
      (sermon as any)?.goodnotes_pdf_url ??
      (sermon as any)?.goodnotesUrl ??
      "",
  );

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

  function handleDownload(kind: "pdf" | "epub" | "word" | "goodnotes") {
    if (!isFullAccess) {
      toast.error("Please unlock this sermon to download.");
      return;
    }

    const url = kind === "pdf" ? pdfUrl : kind === "epub" ? epubUrl : kind === "word" ? wordUrl : goodnotesUrl;

    if (!url) {
      toast.error("This download is not available yet.");
      return;
    }

    openFile(url);
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

          {/* DOWNLOAD BUTTONS (ADDED) */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleDownload("pdf")}
              disabled={!isFullAccess || !pdfUrl}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-semibold ${
                !isFullAccess || !pdfUrl
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground"
              }`}
              title={!isFullAccess ? "Unlock to download" : !pdfUrl ? "Not available yet" : "Download PDF"}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>

            <button
              onClick={() => handleDownload("epub")}
              disabled={!isFullAccess || !epubUrl}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border font-semibold ${
                !isFullAccess || !epubUrl
                  ? "border-border text-muted-foreground cursor-not-allowed"
                  : "border-primary/30"
              }`}
              title={!isFullAccess ? "Unlock to download" : !epubUrl ? "Not available yet" : "Download EPUB"}
            >
              <BookOpen className="h-4 w-4" />
              Download EPUB
            </button>

            <button
              onClick={() => handleDownload("word")}
              disabled={!isFullAccess || !wordUrl}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border font-semibold ${
                !isFullAccess || !wordUrl
                  ? "border-border text-muted-foreground cursor-not-allowed"
                  : "border-primary/30"
              }`}
              title={!isFullAccess ? "Unlock to download" : !wordUrl ? "Not available yet" : "Download Word"}
            >
              <File className="h-4 w-4" />
              Download Word
            </button>

            <button
              onClick={() => handleDownload("goodnotes")}
              disabled={!isFullAccess || !goodnotesUrl}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border font-semibold ${
                !isFullAccess || !goodnotesUrl
                  ? "border-border text-muted-foreground cursor-not-allowed"
                  : "border-primary/30"
              }`}
              title={!isFullAccess ? "Unlock to download" : !goodnotesUrl ? "Not available yet" : "Download GoodNotes"}
            >
              <NotebookPen className="h-4 w-4" />
              Download GoodNotes
            </button>
          </div>

          {/* Optional helper row */}
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
          <div className="prose prose-invert max-w-none">
            {sanitizedHtml ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
            ) : (
              <div className="whitespace-pre-wrap">{manuscriptRaw}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
