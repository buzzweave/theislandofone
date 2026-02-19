

# Fix: Admin Graphics, Public Graphics Pricing, and Admin Videos

## Issue 1: Admin Graphics -- Cannot Upload or Publish/Unpublish

**Root Cause**: The `graphics` table is missing an admin SELECT policy. The only SELECT policy is `is_active = true`, so admins can only see published graphics. When they unpublish a graphic or upload a new one (which defaults to `is_active = true` but may not be readable after insert due to timing), the data disappears from the admin view.

**Fix**: Add a single RLS policy:
```sql
CREATE POLICY "Admins can view all graphics"
ON public.graphics FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

No code changes needed -- the `AdminGraphics.tsx` and `useAdminGraphics` hook already query via Supabase correctly.

---

## Issue 2: Public Graphics Page -- Pricing and Buy Button Not Working

**Root Cause**: The public `Graphics.tsx` page hardcodes the word "Free" and renders a plain download link for every graphic, completely ignoring the `price` field from the database. There is no buy/purchase button.

**Fix**: Update `src/pages/Graphics.tsx` to:
- Show the actual price from the database (e.g., "$2.99") instead of hardcoded "Free"
- If `price > 0`, show a "Buy" button that triggers the existing Stripe checkout flow (via the `create-checkout` edge function)
- If `price` is 0 or the user has already purchased, show the "Download" button

---

## Issue 3: Admin Videos -- Cannot Post Videos

**Root Cause**: The `AdminVideoManager.tsx` and `useVideos.ts` hook use the external VPS API (`api.get("/api/videos")`, `api.post`, etc.) via `src/lib/api.ts`. The VPS at `api.theislandofone.com` is unreachable or rejecting requests, so all CRUD operations fail.

The database already has a `videos` table with proper admin RLS policies. However, the videos table is also missing an admin SELECT policy (same pattern as graphics -- only `is_active = true` is visible).

**Fix**:
1. Add admin SELECT policy for videos table
2. Rewrite `useVideos.ts` to use the Supabase client directly (same pattern as `useGraphics.ts`)
3. Update `AdminVideoManager.tsx` to remove the VPS `api.upload` call for thumbnails and use Supabase storage (`video-thumbnails` bucket) instead

---

## Summary of Changes

### Database Migration (1 migration)
- Add `Admins can view all graphics` SELECT policy on `public.graphics`
- Add `Admins can view all videos` SELECT policy on `public.videos`
- Add storage policy for admin uploads to `video-thumbnails` bucket

### Code Changes

| File | Change |
|------|--------|
| `src/pages/Graphics.tsx` | Show real price, add buy button with Stripe checkout |
| `src/hooks/useVideos.ts` | Replace VPS API calls with Supabase client queries and mutations |
| `src/pages/admin/AdminVideoManager.tsx` | Replace VPS thumbnail upload with Supabase storage upload |

