import { getTierByProductId, tierHasAccess, type MembershipSlug } from "@/lib/stripe";

export interface SermonAccessInput {
  is_free?: number | boolean | null;
  price?: number | string | null;
  access_level?: string | null;
  access_tiers?: string[] | string | null;
}

/** Normalize access_tiers which may arrive as an array, a CSV string, or null. */
export function normalizeAccessTiers(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return value.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
}

export function sermonPrice(sermon: SermonAccessInput | null | undefined): number {
  const n = Number(sermon?.price ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** True when the sermon carries a real charge. */
export function isSermonPaid(sermon: SermonAccessInput | null | undefined): boolean {
  if (!sermon) return false;
  const free = sermon.is_free === true || sermon.is_free === 1;
  return !free && sermonPrice(sermon) > 0;
}

/**
 * A sermon is locked when it is paid OR gated behind a membership level.
 * access_level === "free" alone never unlocks a priced sermon.
 */
export function isSermonLocked(sermon: SermonAccessInput | null | undefined): boolean {
  if (!sermon) return false;
  if (isSermonPaid(sermon)) return true;
  const free = sermon.is_free === true || sermon.is_free === 1;
  const level = (sermon.access_level || "free").toLowerCase();
  const tiers = normalizeAccessTiers(sermon.access_tiers);
  if (level !== "free") return true;
  if (!free && tiers.length > 0) return true;
  return false;
}

/** Minimum tier implied by access_level when no explicit access_tiers are set. */
function tiersFromAccessLevel(level: string): string[] {
  switch (level.toLowerCase()) {
    case "member":
      return ["reader"];
    case "pastor":
      return ["pastor"];
    case "inner_circle":
    case "inner-circle":
      return ["inner-circle"];
    default:
      return [];
  }
}

export function membershipTierFromProductId(productId: string | null | undefined): MembershipSlug | null {
  return getTierByProductId(productId ?? null);
}

/** Does the member's tier entitle them to this sermon? */
export function tierEntitlesSermon(
  sermon: SermonAccessInput | null | undefined,
  userTier: MembershipSlug | null,
): boolean {
  if (!sermon || !userTier) return false;
  const explicit = normalizeAccessTiers(sermon.access_tiers);
  const required = explicit.length > 0 ? explicit : tiersFromAccessLevel(sermon.access_level || "free");
  if (required.length === 0) return false;
  return tierHasAccess(userTier, required);
}

export interface SermonAccessResult {
  locked: boolean;
  hasAccess: boolean;
  price: number;
}

export function resolveSermonAccess(args: {
  sermon: SermonAccessInput | null | undefined;
  userTier: MembershipSlug | null;
  isSubscribed: boolean;
  purchased: boolean;
}): SermonAccessResult {
  const { sermon, userTier, isSubscribed, purchased } = args;
  const locked = isSermonLocked(sermon);
  const price = sermonPrice(sermon);

  if (!locked) return { locked: false, hasAccess: true, price };
  if (purchased) return { locked, hasAccess: true, price };
  if (tierEntitlesSermon(sermon, userTier)) return { locked, hasAccess: true, price };

  // Subscribers unlock membership-gated (not individually priced) sermons.
  if (isSubscribed && !isSermonPaid(sermon)) return { locked, hasAccess: true, price };

  return { locked, hasAccess: false, price };
}
