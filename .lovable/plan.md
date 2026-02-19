

# Add Graphics to Payment System

## Overview

Connect the Graphics page to the existing Stripe payment system so that:
- **Inner Circle subscribers** can download graphics for free (no watermark)
- **Non-subscribers** can buy individual graphics via Stripe Checkout
- Purchased graphics remove the watermark and unlock the high-res download

---

## Changes Required

### 1. Update the `create-checkout` Edge Function

Add `"graphic"` as a supported `type` in the existing edge function. It will work exactly like book/sermon one-time purchases -- pass the graphic's price and ID, create a Stripe Checkout session in `payment` mode.

### 2. Update the Graphics Page (`src/pages/Graphics.tsx`)

- Import `useAuth` from `AuthContext`
- Replace the hardcoded `isInnerCircle = false` with a check against the user's subscription tier (Inner Circle product ID from `src/lib/stripe.ts`)
- Replace the "Coming Soon" toast handler with a real `create-checkout` call for individual graphic purchases
- Add purchase checking: track which graphics the user has already bought
- Show a download button (linking to `file_url`) for purchased or Inner Circle graphics instead of the "Buy" button

### 3. Update the `check-purchase` Edge Function

Add `"graphic"` as a supported item type so the verification flow works for graphics the same way it does for books and sermons.

### 4. Track Graphic Purchases

The existing `purchases` table already supports any `item_type` text value, so no database changes are needed. Graphic purchases will be stored with `item_type = 'graphic'`.

---

## Technical Details

### Graphics Page Logic

```text
if user is Inner Circle subscriber:
  - Hide watermark
  - Show "Download" button (links to file_url)
  - Show "Included" badge

else if user has purchased this graphic:
  - Hide watermark
  - Show "Download" button

else:
  - Show watermark overlay
  - Show price + "Buy" button
  - "Buy" triggers create-checkout with type="graphic"
  - If not logged in, redirect to /auth first
```

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Graphics.tsx` | Add auth, subscription check, purchase flow, download buttons |
| `supabase/functions/create-checkout/index.ts` | Add `"graphic"` type support (same pattern as book/sermon) |
| `supabase/functions/check-purchase/index.ts` | Ensure `"graphic"` type is handled |

### No New Files or Database Changes

Everything fits within the existing architecture. The `purchases` table already accepts any `item_type` string, and the edge functions just need the new type added to their logic.

