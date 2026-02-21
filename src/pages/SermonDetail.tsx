import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSermon } from "@/hooks/useSermons";
import { useAuth } from "@/contexts/AuthContext";
import { getTierByProductId, tierHasAccess } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";
import { toast } from "sonner";

import { ArrowLeft, Lock, Eye, ShoppingCart, Crown, Loader2 } from "lucide-react";

function safeMoney(n: any) {
  const v = Number(n ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function safeText(v: any) {
  return String(v ?? "").trim();
}

export default function SermonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: sermon, isLoading } = useSermon(id);
  const { user, isSubscribed, subscription, checkPurchase } = useAuth();

  const [purchased, setPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Sermon fields (support variations)
  const title = safeText((sermon as any)?.title);
  const scripture = safeText((sermon as any)?.scripture);
  const excerpt = safeText((sermon as any)?.excerpt ?? (sermon as any)?.summary);
  const accessLevel = safeText((sermon as any)?.access_level || "free");
  const isFreeFlag = Boolean((sermon as any)?.is_free === true);
  const chargeEnabled = Boolean((sermon as any)?.charge_enabled ?? (sermon as any)?.charge_for_sermon ?? false);
  const price = safeMoney((sermon as any)?.price);

  // Determine if sermon should be locked
  const isLocked = useMemo(() => {
    if (isFreeFlag || accessLevel === "free") return false;
    // If price is set or charge toggle is on, lock it.
    if (price > 0 || chargeEnabled) return true;
    // Otherwise still locked if access level requires it
    return accessLevel !== "free";
  }, [isFreeFlag, accessLevel, price, chargeEnabled]);

  // Check one-time purchase for this sermon
  useEffect(() => {
    let alive = true;

    async function run() {
      if (!user || !id || !sermon || !isLocked) {
        if (alive) setPurchased(false);
        return;
      }
      setCheckingPurchase(true);
      try {
        // Your auth context signature previously: checkPurchase("sermon", id)
        const ok = await checkPurchase("sermon", id);
        if (alive) setPurchased(!!ok);
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
  }, [user, id, sermon, isLocked, checkPurchase]);

  // Tier access (membership tiers)
  const productId =
    (subscription as any)?.product_id ??
    (subscription as any)?.plan?.product ??
    (subscription as any)?.items?.data?.[0]?.plan?.product ??
    null;

  const userTier = useMemo(() => {
    try {
      return productId ? getTierByProductId(String(productId)) : null;
    } catch {
      return null;
    }
  }, [productId]);

  const tierAccess = useMemo(() => {
    try {
      if (!userTier) return false;
      const accessTiers = (sermon as any)?.access_tiers;
      if (Array.isArray(accessTiers) && accessTiers.length > 0) {
        return tierHasAccess(userTier, accessTiers);
      }
      return tierHasAccess(userTier, accessLevel);
    } catch {
      return false;
    }
  }, [userTier, sermon, accessLevel]);

  const isFullAccess = useMemo(() => {
    if (!isLocked) return true;
    if (!user) return false;
    if (purchased) return true;
    if (isSubscribed) return true;
    if (tierAccess) return true;
    return false;
  }, [isLocked, user, purchased, isSubscribed, tierAccess]);

  // Manuscript / content
  const manuscriptRaw = useMemo(() => {
    const s: any = sermon as any;
    return safeText(s?.manuscript ?? s?.content ?? s?.content_html ?? s?.body ?? "");
  }, [sermon]);

  const sanitizedHtml = useMemo(() => {
    // Render as HTML if it looks like HTML, else render as pre-wrap text
    const looksHtml = manuscriptRaw.includes("<") && manuscriptRaw.includes(">");
    if (!looksHtml) return null;
    return DOMPurify.sanitize(manuscriptRaw);
  }, [manuscriptRaw]);

  // Preview: excerpt ONLY (hard stop) when locked and not entitled
  const shouldShowPaywall = isLocked && !isFullAccess;

  async function handlePurchase() {
    if (!id || !sermon) return;

    if (!user) {
      navigate("/auth", { state: { from: `/sermons/${id}` } });
      return;
    }

    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          type: "sermon",
          itemId: id,
          priceAmount: price,
          itemTitle: title || "Sermon",
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url; // go to Stripe
      } else {
        toast.error("Checkout URL not returned.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading sermon…</div>;
  }

  if (!sermon) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Sermon not found.</div>;
  }

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

          <h1 className="font-display text-3xl sm:text-5xl font-bold mb-2">{title || "Sermon"}</h1>

          {scripture ? <p className="text-sm text-primary/80">{scripture}</p> : null}
        </div>

        {/* PAYWALL VIEW */}
        {shouldShowPaywall ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <p className="text-sm text-muted-foreground mb-4">
              {excerpt
                ? excerpt
                : "This sermon is available to members. Join or purchase to unlock the full manuscript."}
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
              After purchase, refresh this page (or return from Stripe) and the full sermon will unlock.
            </p>
          </div>
        ) : (
          /* FULL VIEW */
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
