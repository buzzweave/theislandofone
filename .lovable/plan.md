

# Fix: Membership Access for Graphics

## Problem

The admin panel allows setting `access_tiers` (Reader, Pastor, Inner Circle) on each graphic, but the public **Graphics page completely ignores this field**. Every paid graphic only shows "Buy Now" — even if the logged-in user has a qualifying membership tier that should grant them free access/download.

## How It Should Work (Same Pattern as Books)

The existing `BookDetail.tsx` already implements this correctly:

```text
1. Get user's tier from subscription product_id
2. Check if user's tier meets the graphic's access_tiers
3. If yes -> show "Download" (no purchase needed)
4. If no  -> show "Buy Now" (Stripe checkout)
```

## Changes

### Update `src/pages/Graphics.tsx` — Add Tier Access Check

- Import `useAuth` context and `getTierByProductId` / `tierHasAccess` from `src/lib/stripe`
- For each graphic card, check if the user's membership tier grants access via `access_tiers`
- If user has tier access OR the graphic is free: show **Download** button
- If user has purchased the graphic (via `checkPurchase`): show **Download** button
- Otherwise: show **Buy Now** button (existing Stripe checkout flow)
- Add a small badge or label showing "Included with [Tier] membership" when tier access applies

### Logic per graphic card (pseudocode)

```text
isFree         = price is 0 or null
hasTierAccess  = tierHasAccess(userTier, graphic.access_tiers)
hasPurchased   = check purchase record for this graphic
canDownload    = isFree OR hasTierAccess OR hasPurchased

if canDownload -> Download button (links to file_url)
else           -> Buy Now button (Stripe checkout)
```

### No other files change

The hook (`useGraphics.ts`) already returns `access_tiers` from the VPS. The admin panel already lets you set tiers. Only the public display logic is missing.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Graphics.tsx` | Add `useAuth`, tier check, and purchase check per graphic; conditionally render Download vs Buy Now |

## What Does NOT Change

- No UI redesign — same card layout, same styles
- No admin panel changes
- No hook or API changes
- No new routes or components
