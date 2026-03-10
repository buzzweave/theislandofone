import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
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

import { useSermon } from "@/hooks/useSermons";
import {
  exportSermonToPdf,
  exportSermonToEpub,
  exportSermonToWord,
  exportSermonToGoodNotesPdf,
} from "@/lib/sermonExport";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SermonManuscriptRenderer } from "@/components/SermonManuscriptRenderer";

function safeText(v: any) {
  return String(v ?? "").trim();
}

function safeMoney(v: any) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export default function SermonDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const navigate = useNavigate();

  const { data: sermon, isLoading } = useSermon(id);

  const auth: any = useAuth();
  const user = auth?.user ?? null;
  const isSubscribed = Boolean(auth?.isSubscribed);
  const checkPurchase = auth?.checkPurchase;

  const [purchased, setPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const sermonRef = useRef<HTMLDivElement | null>(null);

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
  const chargeEnabled = Boolean(
    (sermon as any)?.charge_enabled ?? (sermon as any)?.charge_for_sermon ?? false,
  );
  const price = safeMoney((sermon as any)?.price);

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

  async function handlePurchase() {
    if (!id) return;

    if (!user) {
      navigate("/auth", { state: { from: `/sermons/${id}` } });
      return;
    }

    setCheckoutLoading(true);

    try {
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050816] text-white/70">
        Loading sermon…
      </div>
    );
  }

  if (!sermon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050816] text-white/70">
        Sermon not found.
      </div>
    );
  }

  const showPaywall = isLocked && !isFullAccess;

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto w-full max-w-[860px] px-5 pb-20 pt-8 sm:px-8 sm:pt-10">
        <button
          onClick={() => navigate("/sermons")}
          className="mb-10 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sermons
        </button>

        <div className="mb-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {isLocked ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f2d98a]">
                <Lock className="h-3 w-3" />
                {price > 0 ? `$${price.toFixed(2)}` : "Members"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
                <Eye className="h-3 w-3" />
                Free
              </span>
            )}

            {checkingPurchase ? (
              <span className="inline-flex items-center gap-2 text-xs text-white/55">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking access…
              </span>
            ) : null}
          </div>

          <h1
            className="max-w-[760px] text-[2.7rem] font-bold leading-[0.95] tracking-[-0.03em] text-white sm:text-[4.25rem]"
            style={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}
          >
            {title}
          </h1>

          {scripture ? (
            <p className="mt-5 text-sm font-medium uppercase tracking-[0.18em] text-white/55">
              {scripture}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleDownload("pdf")}
              disabled={!isFullAccess}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                !isFullAccess
                  ? "cursor-not-allowed bg-white/8 text-white/35"
                  : "bg-white text-[#050816] hover:bg-white/90"
              }`}
              title={!isFullAccess ? "Unlock to download" : "Download PDF"}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>

            <button
              onClick={() => handleDownload("epub")}
              disabled={!isFullAccess}
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                !isFullAccess
                  ? "cursor-not-allowed border-white/10 text-white/35"
                  : "border-white/20 text-white hover:border-white/35 hover:bg-white/5"
              }`}
              title={!isFullAccess ? "Unlock to download" : "Download EPUB"}
            >
              <BookOpen className="h-4 w-4" />
              Download EPUB
            </button>

            <button
              onClick={() => handleDownload("word")}
              disabled={!isFullAccess}
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                !isFullAccess
                  ? "cursor-not-allowed border-white/10 text-white/35"
                  : "border-white/20 text-white hover:border-white/35 hover:bg-white/5"
              }`}
              title={!isFullAccess ? "Unlock to download" : "Download Word"}
            >
              <File className="h-4 w-4" />
              Download Word
            </button>

            <button
              onClick={() => handleDownload("goodnotes")}
              disabled={!isFullAccess}
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                !isFullAccess
                  ? "cursor-not-allowed border-white/10 text-white/35"
                  : "border-white/20 text-white hover:border-white/35 hover:bg-white/5"
              }`}
              title={!isFullAccess ? "Unlock to download" : "Download GoodNotes"}
            >
              <NotebookPen className="h-4 w-4" />
              Download GoodNotes
            </button>
          </div>

          {!isFullAccess ? (
            <div className="mt-3 text-xs text-white/45">
              Unlock this sermon to enable downloads.
            </div>
          ) : null}
        </div>

        {showPaywall ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <p className="mb-5 text-base leading-8 text-white/75">
              {excerpt ||
                "This sermon is available to members. Purchase or join to unlock the full manuscript."}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handlePurchase}
                disabled={checkoutLoading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-[#050816]"
              >
                {checkoutLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                Buy for ${price.toFixed(2)}
              </button>

              <Link
                to="/membership"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 font-semibold text-white"
              >
                <Crown className="h-4 w-4" />
                Join Membership
              </Link>

              {!user ? (
                <Link
                  to="/auth"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 font-semibold text-white/85"
                >
                  Sign In
                </Link>
              ) : null}
            </div>

            <p className="mt-4 text-xs text-white/45">
              After payment, return here and refresh. It will unlock automatically.
            </p>
          </div>
        ) : (
          <>
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

            <style>{`
              .sermon-content .pdf-page {
                page-break-after: always;
                break-after: page;
                page-break-inside: avoid;
                break-inside: avoid-page;
              }

              @media screen {
                .sermon-content .pdf-page {
                  padding: 0;
                  margin: 0;
                  border: 0;
                  border-radius: 0;
                  background: transparent;
                }
              }

              .sermon-content {
                max-width: 760px;
              }

              .sermon-content h1 {
                font-size: 4.25rem;
                line-height: 0.95;
                letter-spacing: -0.03em;
                margin: 0 0 2rem 0;
                font-weight: 700;
                font-family: "Cormorant Garamond", "Times New Roman", serif;
              }

              .sermon-content h2 {
                font-size: 2rem;
                line-height: 1.05;
                margin: 3rem 0 1.25rem 0;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: -0.01em;
                font-family: "Cormorant Garamond", "Times New Roman", serif;
              }

              .sermon-content h3 {
                font-size: 1.5rem;
                line-height: 1.1;
                margin: 2.25rem 0 1rem 0;
                font-weight: 700;
                text-transform: uppercase;
                font-family: "Cormorant Garamond", "Times New Roman", serif;
              }

              .sermon-content p {
                font-size: 1.9rem;
                line-height: 1.72;
                margin: 0 0 1.35rem 0;
                color: rgba(255, 255, 255, 0.92);
              }

              .sermon-content ul {
                margin: 0 0 1.5rem 0;
                padding-left: 1.5rem;
              }

              .sermon-content li {
                font-size: 1.25rem;
                line-height: 1.7;
                margin: 0 0 0.75rem 0;
                color: rgba(255, 255, 255, 0.92);
              }

              .sermon-content .title-page .title-wrap {
                text-align: left;
                padding-top: 0;
              }

              .sermon-content .title-page .subtitle {
                margin-top: 1rem;
                font-size: 0.9rem;
                opacity: 0.7;
                text-transform: uppercase;
                letter-spacing: 0.18em;
              }

              @media (max-width: 640px) {
                .sermon-content h1 {
                  font-size: 2.85rem;
                }

                .sermon-content h2 {
                  font-size: 1.85rem;
                  margin-top: 2.4rem;
                }

                .sermon-content h3 {
                  font-size: 1.3rem;
                }

                .sermon-content p,
                .sermon-content li {
                  font-size: 1.28rem;
                  line-height: 1.65;
                }
              }
            `}</style>

            <div ref={sermonRef} className="sermon-content">
              <SermonManuscriptRenderer
                content={manuscriptRaw}
                title={title}
                scripture={scripture}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}export default function SermonDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const navigate = useNavigate();

  const { data: sermon, isLoading } = useSermon(id);

  const auth: any = useAuth();
  const user = auth?.user ?? null;
  const isSubscribed = Boolean(auth?.isSubscribed);
  const checkPurchase = auth?.checkPurchase;

  const [purchased, setPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const sermonRef = useRef<any>(null);

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
  const chargeEnabled = Boolean(
    (sermon as any)?.charge_enabled ?? (sermon as any)?.charge_for_sermon ?? false,
  );
  const price = safeMoney((sermon as any)?.price);

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

  async function handlePurchase() {
    if (!id) return;

    if (!user) {
      navigate("/auth", { state: { from: `/sermons/${id}` } });
      return;
    }

    setCheckoutLoading(true);

    try {
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050816] text-white/70">
        Loading sermon…
      </div>
    );
  }

  if (!sermon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050816] text-white/70">
        Sermon not found.
      </div>
    );
  }

  const showPaywall = isLocked && !isFullAccess;

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto w-full max-w-[860px] px-5 pb-20 pt-8 sm:px-8 sm:pt-10">
        <button
          onClick={() => navigate("/sermons")}
          className="mb-10 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sermons
        </button>

        <div className="mb-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {isLocked ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f2d98a]">
                <Lock className="h-3 w-3" />
                {price > 0 ? `$${price.toFixed(2)}` : "Members"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
                <Eye className="h-3 w-3" />
                Free
              </span>
            )}

            {checkingPurchase ? (
              <span className="inline-flex items-center gap-2 text-xs text-white/55">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking access…
              </span>
            ) : null}
          </div>

          <h1
            className="max-w-[760px] text-[2.7rem] font-bold leading-[0.95] tracking-[-0.03em] text-white sm:text-[4.25rem]"
            style={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}
          >
            {title}
          </h1>

          {scripture ? (
            <p className="mt-5 text-sm font-medium uppercase tracking-[0.18em] text-white/55">
              {scripture}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleDownload("pdf")}
              disabled={!isFullAccess}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                !isFullAccess
                  ? "cursor-not-allowed bg-white/8 text-white/35"
                  : "bg-white text-[#050816] hover:bg-white/90"
              }`}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>

            <button
              onClick={() => handleDownload("epub")}
              disabled={!isFullAccess}
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                !isFullAccess
                  ? "cursor-not-allowed border-white/10 text-white/35"
                  : "border-white/20 text-white hover:border-white/35 hover:bg-white/5"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Download EPUB
            </button>

            <button
              onClick={() => handleDownload("word")}
              disabled={!isFullAccess}
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                !isFullAccess
                  ? "cursor-not-allowed border-white/10 text-white/35"
                  : "border-white/20 text-white hover:border-white/35 hover:bg-white/5"
              }`}
            >
              <File className="h-4 w-4" />
              Download Word
            </button>

            <button
              onClick={() => handleDownload("goodnotes")}
              disabled={!isFullAccess}
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                !isFullAccess
                  ? "cursor-not-allowed border-white/10 text-white/35"
                  : "border-white/20 text-white hover:border-white/35 hover:bg-white/5"
              }`}
            >
              <NotebookPen className="h-4 w-4" />
              Download GoodNotes
            </button>
          </div>

          {!isFullAccess ? (
            <div className="mt-3 text-xs text-white/45">
              Unlock this sermon to enable downloads.
            </div>
          ) : null}
        </div>

        {showPaywall ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <p className="mb-5 text-base leading-8 text-white/75">
              {excerpt ||
                "This sermon is available to members. Purchase or join to unlock the full manuscript."}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handlePurchase}
                disabled={checkoutLoading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-[#050816]"
              >
                {checkoutLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                Buy for ${price.toFixed(2)}
              </button>

              <Link
                to="/membership"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 font-semibold text-white"
              >
                <Crown className="h-4 w-4" />
                Join Membership
              </Link>

              {!user ? (
                <Link
                  to="/auth"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 font-semibold text-white/85"
                >
                  Sign In
                </Link>
              ) : null}
            </div>

            <p className="mt-4 text-xs text-white/45">
              After payment, return here and refresh. It will unlock automatically.
            </p>
          </div>
        ) : (
          <>
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

            <style>{`
              .sermon-content .pdf-page {
                page-break-after: always;
                break-after: page;
                page-break-inside: avoid;
                break-inside: avoid-page;
              }

              @media screen {
                .sermon-content .pdf-page {
                  padding: 0;
                  margin: 0;
                  border: 0;
                  border-radius: 0;
                  background: transparent;
                }
              }

              .sermon-content {
                max-width: 760px;
              }

              .sermon-content h1 {
                font-size: 4.25rem;
                line-height: 0.95;
                letter-spacing: -0.03em;
                margin: 0 0 2rem 0;
                font-weight: 700;
                font-family: "Cormorant Garamond", "Times New Roman", serif;
              }

              .sermon-content h2 {
                font-size: 2rem;
                line-height: 1.05;
                margin: 3rem 0 1.25rem 0;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: -0.01em;
                font-family: "Cormorant Garamond", "Times New Roman", serif;
              }

              .sermon-content h3 {
                font-size: 1.5rem;
                line-height: 1.1;
                margin: 2.25rem 0 1rem 0;
                font-weight: 700;
                text-transform: uppercase;
                font-family: "Cormorant Garamond", "Times New Roman", serif;
              }

              .sermon-content p {
                font-size: 1.9rem;
                line-height: 1.72;
                margin: 0 0 1.35rem 0;
                color: rgba(255, 255, 255, 0.92);
              }

              .sermon-content ul {
                margin: 0 0 1.5rem 0;
                padding-left: 1.5rem;
              }

              .sermon-content li {
                font-size: 1.25rem;
                line-height: 1.7;
                margin: 0 0 0.75rem 0;
                color: rgba(255, 255, 255, 0.92);
              }

              .sermon-content .title-page .title-wrap {
                text-align: left;
                padding-top: 0;
              }

              .sermon-content .title-page .subtitle {
                margin-top: 1rem;
                font-size: 0.9rem;
                opacity: 0.7;
                text-transform: uppercase;
                letter-spacing: 0.18em;
              }

              @media (max-width: 640px) {
                .sermon-content h1 {
                  font-size: 2.85rem;
                }

                .sermon-content h2 {
                  font-size: 1.85rem;
                  margin-top: 2.4rem;
                }

                .sermon-content h3 {
                  font-size: 1.3rem;
                }

                .sermon-content p,
                .sermon-content li {
                  font-size: 1.28rem;
                  line-height: 1.65;
                }
              }
            `}</style>

            <div ref={sermonRef} className="sermon-content">
              <SermonManuscriptRenderer
                content={manuscriptRaw}
                title={title}
                scripture={scripture}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}}

function escapeHtml(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildLockedPages(args: {
  title: string;
  scriptureRef: string;
  rawText: string;
  sanitizedHtml: string | null;
}) {
  const { title, scriptureRef, rawText, sanitizedHtml } = args;

  const alreadyWrapped =
    typeof sanitizedHtml === "string" &&
    sanitizedHtml.includes('class="pdf-page"');

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

  const { data: sermon, isLoading } = useSermon(id);

  const auth: any = useAuth();
  const user = auth?.user ?? null;
  const isSubscribed = Boolean(auth?.isSubscribed);
  const checkPurchase = auth?.checkPurchase;

  const [purchased, setPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const sermonRef = useRef<any>(null);

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
  const chargeEnabled = Boolean(
    (sermon as any)?.charge_enabled ?? (sermon as any)?.charge_for_sermon ?? false,
  );
  const price = safeMoney((sermon as any)?.price);

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

  useMemo(() => {
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050816] text-white/70">
        Loading sermon…
      </div>
    );
  }

  if (!sermon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050816] text-white/70">
        Sermon not found.
      </div>
    );
  }

  const showPaywall = isLocked && !isFullAccess;

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto w-full max-w-[860px] px-5 pb-20 pt-8 sm:px-8 sm:pt-10">
        <button
          onClick={() => navigate("/sermons")}
          className="mb-10 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sermons
        </button>

        <div className="mb-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {isLocked ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f2d98a]">
                <Lock className="h-3 w-3" />
                {price > 0 ? `$${price.toFixed(2)}` : "Members"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
                <Eye className="h-3 w-3" />
                Free
              </span>
            )}

            {checkingPurchase ? (
              <span className="inline-flex items-center gap-2 text-xs text-white/55">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking access…
              </span>
            ) : null}
          </div>

          <h1
            className="max-w-[760px] text-[2.7rem] font-bold leading-[0.95] tracking-[-0.03em] text-white sm:text-[4.25rem]"
            style={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}
          >
            {title}
          </h1>

          {scripture ? (
            <p className="mt-5 text-sm font-medium uppercase tracking-[0.18em] text-white/55">
              {scripture}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleDownload("pdf")}
              disabled={!isFullAccess}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                !isFullAccess
                  ? "cursor-not-allowed bg-white/8 text-white/35"
                  : "bg-white text-[#050816] hover:bg-white/90"
              }`}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>

            <button
              onClick={() => handleDownload("epub")}
              disabled={!isFullAccess}
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                !isFullAccess
                  ? "cursor-not-allowed border-white/10 text-white/35"
                  : "border-white/20 text-white hover:border-white/35 hover:bg-white/5"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Download EPUB
            </button>

            <button
              onClick={() => handleDownload("word")}
              disabled={!isFullAccess}
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                !isFullAccess
                  ? "cursor-not-allowed border-white/10 text-white/35"
                  : "border-white/20 text-white hover:border-white/35 hover:bg-white/5"
              }`}
            >
              <File className="h-4 w-4" />
              Download Word
            </button>

            <button
              onClick={() => handleDownload("goodnotes")}
              disabled={!isFullAccess}
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                !isFullAccess
                  ? "cursor-not-allowed border-white/10 text-white/35"
                  : "border-white/20 text-white hover:border-white/35 hover:bg-white/5"
              }`}
            >
              <NotebookPen className="h-4 w-4" />
              Download GoodNotes
            </button>
          </div>

          {!isFullAccess ? (
            <div className="mt-3 text-xs text-white/45">
              Unlock this sermon to enable downloads.
            </div>
          ) : null}
        </div>

        {showPaywall ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <p className="mb-5 text-base leading-8 text-white/75">
              {excerpt ||
                "This sermon is available to members. Purchase or join to unlock the full manuscript."}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handlePurchase}
                disabled={checkoutLoading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-[#050816]"
              >
                {checkoutLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                Buy for ${price.toFixed(2)}
              </button>

              <Link
                to="/membership"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 font-semibold text-white"
              >
                <Crown className="h-4 w-4" />
                Join Membership
              </Link>

              {!user ? (
                <Link
                  to="/auth"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 font-semibold text-white/85"
                >
                  Sign In
                </Link>
              ) : null}
            </div>

            <p className="mt-4 text-xs text-white/45">
              After payment, return here and refresh. It will unlock automatically.
            </p>
          </div>
        ) : (
          <>
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

            <style>{`
              .sermon-content .pdf-page {
                page-break-after: always;
                break-after: page;
                page-break-inside: avoid;
                break-inside: avoid-page;
              }

              @media screen {
                .sermon-content .pdf-page {
                  padding: 0;
                  margin: 0;
                  border: 0;
                  border-radius: 0;
                  background: transparent;
                }
              }

              .sermon-content {
                max-width: 760px;
              }

              .sermon-content h1 {
                font-size: 4.25rem;
                line-height: 0.95;
                letter-spacing: -0.03em;
                margin: 0 0 2rem 0;
                font-weight: 700;
                font-family: "Cormorant Garamond", "Times New Roman", serif;
              }

              .sermon-content h2 {
                font-size: 2rem;
                line-height: 1.05;
                margin: 3rem 0 1.25rem 0;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: -0.01em;
                font-family: "Cormorant Garamond", "Times New Roman", serif;
              }

              .sermon-content h3 {
                font-size: 1.5rem;
                line-height: 1.1;
                margin: 2.25rem 0 1rem 0;
                font-weight: 700;
                text-transform: uppercase;
                font-family: "Cormorant Garamond", "Times New Roman", serif;
              }

              .sermon-content p {
                font-size: 1.9rem;
                line-height: 1.72;
                margin: 0 0 1.35rem 0;
                color: rgba(255, 255, 255, 0.92);
              }

              .sermon-content ul {
                margin: 0 0 1.5rem 0;
                padding-left: 1.5rem;
              }

              .sermon-content li {
                font-size: 1.25rem;
                line-height: 1.7;
                margin: 0 0 0.75rem 0;
                color: rgba(255, 255, 255, 0.92);
              }

              .sermon-content .title-page .title-wrap {
                text-align: left;
                padding-top: 0;
              }

              .sermon-content .title-page .subtitle {
                margin-top: 1rem;
                font-size: 0.9rem;
                opacity: 0.7;
                text-transform: uppercase;
                letter-spacing: 0.18em;
              }

              @media (max-width: 640px) {
                .sermon-content h1 {
                  font-size: 2.85rem;
                }

                .sermon-content h2 {
                  font-size: 1.85rem;
                  margin-top: 2.4rem;
                }

                .sermon-content h3 {
                  font-size: 1.3rem;
                }

                .sermon-content p,
                .sermon-content li {
                  font-size: 1.28rem;
                  line-height: 1.65;
                }
              }
            `}</style>

            <div ref={sermonRef} className="sermon-content">
              <SermonManuscriptRenderer
                content={manuscriptRaw}
                title={title}
                scripture={scripture}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}  const [checkingPurchase, setCheckingPurchase] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const sermonRef = useRef<any>(null);

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
  const chargeEnabled = Boolean(
    (sermon as any)?.charge_enabled ?? (sermon as any)?.charge_for_sermon ?? false,
  );
  const price = safeMoney((sermon as any)?.price);

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050816] text-white/70">
        Loading sermon…
      </div>
    );
  }

  if (!sermon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050816] text-white/70">
        Sermon not found.
      </div>
    );
  }

  const showPaywall = isLocked && !isFullAccess;

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto w-full max-w-[860px] px-5 pb-20 pt-8 sm:px-8 sm:pt-10">
        <button
          onClick={() => navigate("/sermons")}
          className="mb-10 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sermons
        </button>

        <div className="mb-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {isLocked ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f2d98a]">
                <Lock className="h-3 w-3" />
                {price > 0 ? `$${price.toFixed(2)}` : "Members"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
                <Eye className="h-3 w-3" />
                Free
              </span>
            )}

            {checkingPurchase ? (
              <span className="inline-flex items-center gap-2 text-xs text-white/55">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking access…
              </span>
            ) : null}
          </div>

          <h1
            className="max-w-[760px] font-display text-[2.7rem] font-bold leading-[0.95] tracking-[-0.03em] text-white sm:text-[4.25rem]"
            style={{ fontFamily: 'var(--font-display, "Cormorant Garamond", "Times New Roman", serif)' }}
          >
            {title}
          </h1>

          {scripture ? (
            <p className="mt-5 text-sm font-medium uppercase tracking-[0.18em] text-white/55">
              {scripture}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleDownload("pdf")}
              disabled={!isFullAccess}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                !isFullAccess
                  ? "cursor-not-allowed bg-white/8 text-white/35"
                  : "bg-white text-[#050816] hover:bg-white/90"
              }`}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>

            <button
              onClick={() => handleDownload("epub")}
              disabled={!isFullAccess}
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                !isFullAccess
                  ? "cursor-not-allowed border-white/10 text-white/35"
                  : "border-white/20 text-white hover:border-white/35 hover:bg-white/5"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Download EPUB
            </button>

            <button
              onClick={() => handleDownload("word")}
              disabled={!isFullAccess}
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                !isFullAccess
                  ? "cursor-not-allowed border-white/10 text-white/35"
                  : "border-white/20 text-white hover:border-white/35 hover:bg-white/5"
              }`}
            >
              <File className="h-4 w-4" />
              Download Word
            </button>

            <button
              onClick={() => handleDownload("goodnotes")}
              disabled={!isFullAccess}
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                !isFullAccess
                  ? "cursor-not-allowed border-white/10 text-white/35"
                  : "border-white/20 text-white hover:border-white/35 hover:bg-white/5"
              }`}
            >
              <NotebookPen className="h-4 w-4" />
              Download GoodNotes
            </button>
          </div>

          {!isFullAccess ? (
            <div className="mt-3 text-xs text-white/45">
              Unlock this sermon to enable downloads.
            </div>
          ) : null}
        </div>

        {showPaywall ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <p className="mb-5 text-base leading-8 text-white/75">
              {excerpt ||
                "This sermon is available to members. Purchase or join to unlock the full manuscript."}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handlePurchase}
                disabled={checkoutLoading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-[#050816]"
              >
                {checkoutLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                Buy for ${price.toFixed(2)}
              </button>

              <Link
                to="/membership"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 font-semibold text-white"
              >
                <Crown className="h-4 w-4" />
                Join Membership
              </Link>

              {!user ? (
                <Link
                  to="/auth"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 font-semibold text-white/85"
                >
                  Sign In
                </Link>
              ) : null}
            </div>

            <p className="mt-4 text-xs text-white/45">
              After payment, return here and refresh. It will unlock automatically.
            </p>
          </div>
        ) : (
          <>
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

            <style>{`
              .sermon-content .pdf-page{
                page-break-after: always;
                break-after: page;
                page-break-inside: avoid;
                break-inside: avoid-page;
              }

              @media screen{
                .sermon-content .pdf-page{
                  padding: 0;
                  margin: 0;
                  border: 0;
                  border-radius: 0;
                  background: transparent;
                }
              }

              .sermon-content{
                max-width: 760px;
              }

              .sermon-content h1{
                font-size: 4.25rem;
                line-height: 0.95;
                letter-spacing: -0.03em;
                margin: 0 0 2rem 0;
                font-weight: 700;
              }

              .sermon-content h2{
                font-size: 2rem;
                line-height: 1.05;
                margin: 3rem 0 1.25rem 0;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: -0.01em;
              }

              .sermon-content h3{
                font-size: 1.5rem;
                line-height: 1.1;
                margin: 2.25rem 0 1rem 0;
                font-weight: 700;
                text-transform: uppercase;
              }

              .sermon-content p{
                font-size: 1.9rem;
                line-height: 1.72;
                margin: 0 0 1.35rem 0;
                color: rgba(255,255,255,0.92);
              }

              .sermon-content ul{
                margin: 0 0 1.5rem 0;
                padding-left: 1.5rem;
              }

              .sermon-content li{
                font-size: 1.25rem;
                line-height: 1.7;
                margin: 0 0 0.75rem 0;
                color: rgba(255,255,255,0.92);
              }

              .sermon-content .title-page .title-wrap{
                text-align: left;
                padding-top: 0;
              }

              .sermon-content .title-page .subtitle{
                margin-top: 1rem;
                font-size: 0.9rem;
                opacity: 0.7;
                text-transform: uppercase;
                letter-spacing: 0.18em;
              }

              @media (max-width: 640px){
                .sermon-content h1{
                  font-size: 2.85rem;
                }

                .sermon-content h2{
                  font-size: 1.85rem;
                  margin-top: 2.4rem;
                }

                .sermon-content h3{
                  font-size: 1.3rem;
                }

                .sermon-content p,
                .sermon-content li{
                  font-size: 1.28rem;
                  line-height: 1.65;
                }
              }
            `}</style>

            <div ref={sermonRef} className="sermon-content">
              <SermonManuscriptRenderer
                content={manuscriptRaw}
                title={title}
                scripture={scripture}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}}

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

            <div ref={sermonRef}>
              <SermonManuscriptRenderer
                content={manuscriptRaw}
                title={title}
                scripture={scripture}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
