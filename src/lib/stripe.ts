// Stripe product/price mapping for membership subscriptions
export const MEMBERSHIP_TIERS = {
  reader: {
    product_id: "prod_U0P10UqgQoHMC1",
    price_id: "price_1T2OD320LtcjVY26B6ZCvaQ4",
    name: "Reader",
    price: 9.99,
  },
  pastor: {
    product_id: "prod_U0P1BekfHAyBdT",
    price_id: "price_1T2ODJ20LtcjVY268Ojs3ahx",
    name: "Pastor",
    price: 19.99,
  },
  "inner-circle": {
    product_id: "prod_U0P1B7ICDjNhyK",
    price_id: "price_1T2ODU20LtcjVY26GSmrHK8g",
    name: "Inner Circle",
    price: 39.99,
  },
} as const;

export type MembershipSlug = keyof typeof MEMBERSHIP_TIERS;

export function getTierByProductId(productId: string | null): MembershipSlug | null {
  if (!productId) return null;
  for (const [slug, tier] of Object.entries(MEMBERSHIP_TIERS)) {
    if (tier.product_id === productId) return slug as MembershipSlug;
  }
  return null;
}
