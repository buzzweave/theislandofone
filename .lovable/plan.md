

# Fix: Admin Graphics, Admin Videos, and Public Graphics Pricing

## Root Cause

The admin panel authenticates via an external VPS API (`api.theislandofone.com`), storing a JWT in localStorage. However, the recent code changes made admin graphics and videos use the Supabase client directly (`supabase.from("graphics")`, `supabase.from("videos")`). Since the admin is NOT signed into Supabase Auth, `auth.uid()` is null, and all RLS policies requiring `has_role(auth.uid(), 'admin')` reject the operations.

The postgres logs confirm this with repeated errors: `"new row violates row-level security policy for table 'graphics'"` and `"new row violates row-level security policy for table 'videos'"`.

## Fix Strategy

Use edge functions with the service role key for all admin CRUD operations. The `graphics-admin` edge function already exists and validates the VPS admin token before using the service role key to bypass RLS. We need to apply this same pattern for videos, and update the hooks/pages to call these edge functions instead of the Supabase client directly.

---

## Changes

### 1. Create `videos-admin` Edge Function
A new edge function mirroring `graphics-admin` that handles GET/POST/PUT/DELETE for videos using the service role key after validating the VPS admin token.

**File**: `supabase/functions/videos-admin/index.ts`

### 2. Rewrite `useGraphics.ts` Admin Hook
Change `useAdminGraphics` to call the `graphics-admin` edge function (with `x-admin-token` header) instead of `supabase.from("graphics")`.

### 3. Rewrite `useVideos.ts` Admin Hooks
Change `useAdminVideos`, `useAddVideo`, `useUpdateVideo`, `useDeleteVideo` to call the `videos-admin` edge function instead of `supabase.from("videos")`.

### 4. Update `AdminGraphics.tsx`
Replace all direct `supabase.from("graphics").insert/update/delete` calls with fetch calls to the `graphics-admin` edge function, passing `x-admin-token` from localStorage.

### 5. Update `AdminVideoManager.tsx`
Replace the `supabase.from("videos")` mutation hooks with the new edge-function-based hooks. Keep the thumbnail upload via Supabase storage (public bucket, no RLS needed for uploads to public buckets).

### 6. Public Graphics Page -- Already Working
The `Graphics.tsx` page code is already correct -- it shows dynamic pricing and a Buy Now button that calls the `create-checkout` edge function, which supports `type: "graphic"`. No changes needed here.

---

## Summary

| File | Change |
|------|--------|
| `supabase/functions/videos-admin/index.ts` | New edge function for admin video CRUD |
| `src/hooks/useGraphics.ts` | Admin hook calls `graphics-admin` edge function |
| `src/hooks/useVideos.ts` | All admin hooks call `videos-admin` edge function |
| `src/pages/admin/AdminGraphics.tsx` | Replace direct Supabase calls with edge function calls |
| `src/pages/admin/AdminVideoManager.tsx` | Use new edge-function-based hooks |

No database migrations needed -- the RLS policies are correctly configured.

