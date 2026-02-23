import React, { useEffect, useMemo, useState } from "react";
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

/* SAFE HTML ESCAPE (no replaceAll = build safe) */
function escapeHtml(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/*
LOCKED PAGE SYSTEM (BUILD SAFE)

If sermon already contains:
<section class="pdf-page">...</section>
→ we respect it

Otherwise we generate:
PAGE 1: Title
PAGE 2: Everything else
*/
function buildLockedPages(title: string, scripture: string, raw: string, html: string | null) {
  const alreadyWrapped = html && html.includes('class="pdf-page"');
  if (alreadyWrapped) return html!;

  const page1 = `
<section class="pdf-page title-page">
  <div class="title-wrap">
    <h1>${escapeHtml(title)}</h1>
    ${scripture ? `<p class="subtitle">${escapeHtml(scripture)}</p>` : ""}
  </div>
</section>`.trim();

  const body = html
    ? html
    : `<p>${escapeHtml(raw)
        .replace(/\n{2,}/g, "\n\n")
        .replace(/\n/g, "<br/>")}</p>`;

  const page2 = `
<section class="pdf-page scripture-illustration-page">
  ${body}
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
  const chargeEnabled = Boolean((sermon as any)?.charge_enabled ?? false);
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

  /* BUILD SAFE PAGED HTML */
  const pagedHtml = useMemo(() => {
    return buildLockedPages(title, scripture, manuscriptRaw, sanitizedHtml);
  }, [title, scripture, manuscriptRaw, sanitizedHtml]);

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
        {showPaywall ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <p className="text-sm text-muted-foreground mb-4">{excerpt || "This sermon is available to members."}</p>
          </div>
        ) : (
          <>
            {/* PRINT LOCK */}
            <style>{`
@media print {
  @page { size: A4 portrait; margin: 0.75in; }

  .sermon-content .pdf-page {
    page-break-after: always;
    break-after: page;
    page-break-inside: avoid;
    break-inside: avoid-page;
  }
}
            `}</style>

            <style>{`
.sermon-content .pdf-page{
  page-break-after: always;
  break-after: page;
  margin-bottom: 24px;
}

/* Big GoodNotes fonts */
.sermon-content h1{ font-size:44px; }
.sermon-content h2{ font-size:28px; }
.sermon-content p{ font-size:18px; line-height:1.6; }

.title-page{ text-align:center; padding-top:40px; }
.subtitle{ opacity:.7; }
            `}</style>

            <div className="prose prose-invert max-w-none">
              <article className="sermon-content">
                <div dangerouslySetInnerHTML={{ __html: pagedHtml }} />
              </article>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
