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

function normalizeLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function isAllCapsLike(line: string) {
  const cleaned = line.replace(/[^A-Za-z]/g, "");
  if (!cleaned) return false;
  return cleaned === cleaned.toUpperCase() && cleaned.length > 3;
}

function isMainPointHeading(line: string) {
  const trimmed = normalizeLine(line);

  if (
    /^(MAIN POINT|POINT|KEY POINT|TEACHING INSIGHT|SCRIPTURE REFERENCE|ILLUSTRATION|INTRODUCTION|CLOSING THOUGHTS?|ALTAR CALL|APPLICATION)\b/i.test(
      trimmed,
    )
  ) {
    return true;
  }

  if (/^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+/i.test(trimmed) || /^(I|II|III|IV|V|VI|VII|VIII|IX|X)\b/i.test(trimmed)) {
    return true;
  }

  if (isAllCapsLike(trimmed) && trimmed.length <= 90) {
    return true;
  }

  return false;
}

function isBulletLine(line: string) {
  const trimmed = line.trim();
  return /^([-•*])\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed);
}

function lineToBullet(line: string) {
  return escapeHtml(line.trim().replace(/^([-•*]|\d+\.)\s+/, ""));
}

function formatPlainTextToHtml(rawText: string, title: string, scriptureRef: string) {
  const lines = String(rawText ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");

  const html: string[] = [];

  html.push(`
    <section class="pdf-page title-page">
      <div class="title-wrap">
        <h1>${escapeHtml(title || "Sermon")}</h1>
        ${scriptureRef ? `<p class="subtitle">${escapeHtml(scriptureRef)}</p>` : ""}
      </div>
    </section>
  `);

  html.push(`<section class="pdf-page manuscript-page">`);

  let paragraphBuffer: string[] = [];
  let bulletBuffer: string[] = [];
  let firstRealHeadingRendered = false;

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    const text = paragraphBuffer.join(" ").replace(/\s+/g, " ").trim();
    if (text) {
      html.push(`<p>${escapeHtml(text)}</p>`);
    }
    paragraphBuffer = [];
  };

  const flushBullets = () => {
    if (!bulletBuffer.length) return;
    html.push("<ul>");
    bulletBuffer.forEach((b) => {
      html.push(`<li>${b}</li>`);
    });
    html.push("</ul>");
    bulletBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? "";
    const line = normalizeLine(rawLine);

    if (!line) {
      flushParagraph();
      flushBullets();
      continue;
    }

    if (isBulletLine(line)) {
      flushParagraph();
      bulletBuffer.push(lineToBullet(line));
      continue;
    }

    if (isMainPointHeading(line)) {
      flushParagraph();
      flushBullets();

      const cleanHeading = line
        .replace(/^MAIN POINT\s*[:\-]?\s*/i, "")
        .replace(/^POINT\s*[:\-]?\s*/i, "")
        .trim();

      if (!firstRealHeadingRendered) {
        html.push(`<h2>${escapeHtml(cleanHeading)}</h2>`);
        firstRealHeadingRendered = true;
      } else {
        html.push(`<h2>${escapeHtml(cleanHeading)}</h2>`);
      }
      continue;
    }

    const next = normalizeLine(lines[i + 1] ?? "");
    const looksLikeStandaloneShortHeading =
      line.length <= 65 &&
      !/[.!?]$/.test(line) &&
      !next.startsWith("-") &&
      !next.startsWith("•") &&
      !/^\d+\.\s+/.test(next) &&
      next.length > 0;

    if (looksLikeStandaloneShortHeading) {
      flushParagraph();
      flushBullets();
      html.push(`<h3>${escapeHtml(line)}</h3>`);
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushBullets();

  html.push(`</section>`);

  return html.join("\n");
}

function buildFormattedPages(args: {
  title: string;
  scriptureRef: string;
  rawText: string;
  sanitizedHtml: string | null;
}) {
  const { title, scriptureRef, rawText, sanitizedHtml } = args;

  if (sanitizedHtml && sanitizedHtml.includes('class="pdf-page"')) {
    return sanitizedHtml;
  }

  if (sanitizedHtml) {
    return `
      <section class="pdf-page title-page">
        <div class="title-wrap">
          <h1>${escapeHtml(title)}</h1>
          ${scriptureRef ? `<p class="subtitle">${escapeHtml(scriptureRef)}</p>` : ""}
        </div>
      </section>
      <section class="pdf-page manuscript-page">
        ${sanitizedHtml}
      </section>
    `;
  }

  return formatPlainTextToHtml(rawText, title, scriptureRef);
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
  const chargeEnabled = Boolean((sermon as any)?.charge_enabled ?? (sermon as any)?.charge_for_sermon ?? false);
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

    return DOMPurify.sanitize(manuscriptRaw, {
      USE_PROFILES: { html: true },
    });
  }, [manuscriptRaw]);

  const formattedHtml = useMemo(() => {
    const built = buildFormattedPages({
      title,
      scriptureRef: scripture,
      rawText: manuscriptRaw,
      sanitizedHtml,
    });

    return DOMPurify.sanitize(built, {
      USE_PROFILES: { html: true },
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
      <div className="min-h-screen flex items-center justify-center bg-[#050816] text-white/70">Loading sermon…</div>
    );
  }

  if (!sermon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050816] text-white/70">Sermon not found.</div>
    );
  }

  const showPaywall = isLocked && !isFullAccess;

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800;900&display=swap"
        rel="stylesheet"
      />

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
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            {title}
          </h1>

          {scripture ? (
            <p className="mt-5 text-sm font-medium uppercase tracking-[0.18em] text-white/55">{scripture}</p>
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
            <div className="mt-3 text-xs text-white/45">Unlock this sermon to enable downloads.</div>
          ) : null}
        </div>

        {showPaywall ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <p className="mb-5 text-base leading-8 text-white/75">
              {excerpt || "This sermon is available to members. Purchase or join to unlock the full manuscript."}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handlePurchase}
                disabled={checkoutLoading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-[#050816]"
              >
                {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
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
                @page {
                  size: A4 portrait;
                  margin: 0.7in;
                }

                html, body {
                  background: #050816 !important;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }

                .sermon-content .pdf-page {
                  page-break-after: always;
                  break-after: page;
                }

                .sermon-content .pdf-page:last-child {
                  page-break-after: auto;
                  break-after: auto;
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
              }
            `}</style>

            <style>{`
              .sermon-content {
                max-width: 760px;
              }

              .sermon-content .pdf-page {
                page-break-after: always;
                break-after: page;
              }

              .sermon-content .pdf-page:last-child {
                page-break-after: auto;
                break-after: auto;
              }

              .sermon-content .title-page {
                padding: 0 0 1.5rem 0;
              }

              .sermon-content .title-wrap {
                text-align: left;
              }

              .sermon-content .manuscript-page {
                padding-top: 0.25rem;
              }

              .sermon-content h1,
              .sermon-content h2,
              .sermon-content h3 {
                font-family: "Playfair Display", serif;
                color: #ffffff;
                letter-spacing: -0.03em;
              }

              .sermon-content h1 {
                font-size: 4.2rem;
                line-height: 0.92;
                margin: 0 0 2.25rem 0;
                font-weight: 900;
                max-width: 720px;
              }

              .sermon-content .subtitle {
                margin: 0 0 2.25rem 0;
                font-size: 0.92rem;
                line-height: 1.4;
                color: rgba(255,255,255,0.65);
                text-transform: uppercase;
                letter-spacing: 0.18em;
                font-family: Inter, ui-sans-serif, system-ui, sans-serif;
              }

              .sermon-content h2 {
                font-size: 2.1rem;
                line-height: 1.02;
                margin: 3.2rem 0 1.35rem 0;
                font-weight: 800;
                text-transform: uppercase;
              }

              .sermon-content h3 {
                font-size: 1.4rem;
                line-height: 1.08;
                margin: 2rem 0 0.85rem 0;
                font-weight: 700;
                text-transform: uppercase;
              }

              .sermon-content p {
                font-size: 1.18rem;
                line-height: 1.88;
                margin: 0 0 1.55rem 0;
                color: rgba(255,255,255,0.94);
                font-family: Inter, ui-sans-serif, system-ui, sans-serif;
                white-space: normal;
              }

              .sermon-content ul {
                margin: 0.25rem 0 1.8rem 0;
                padding-left: 1.5rem;
              }

              .sermon-content li {
                font-size: 1.14rem;
                line-height: 1.85;
                margin: 0 0 0.9rem 0;
                color: rgba(255,255,255,0.94);
                font-family: Inter, ui-sans-serif, system-ui, sans-serif;
              }

              .sermon-content strong {
                color: #ffffff;
                font-weight: 700;
              }

              .sermon-content em {
                font-style: italic;
              }

              @media screen {
                .sermon-content .pdf-page {
                  background: transparent;
                  border: 0;
                  border-radius: 0;
                  margin: 0;
                  padding: 0;
                }
              }

              @media (max-width: 640px) {
                .sermon-content h1 {
                  font-size: 3rem;
                  line-height: 0.95;
                  margin-bottom: 1.8rem;
                }

                .sermon-content h2 {
                  font-size: 1.8rem;
                  margin-top: 2.5rem;
                }

                .sermon-content h3 {
                  font-size: 1.2rem;
                }

                .sermon-content p,
                .sermon-content li {
                  font-size: 1.06rem;
                  line-height: 1.75;
                }

                .sermon-content .subtitle {
                  font-size: 0.78rem;
                }
              }
            `}</style>

            <div ref={sermonRef} className="sermon-content" dangerouslySetInnerHTML={{ __html: formattedHtml }} />
          </>
        )}
      </div>
    </div>
  );
}
