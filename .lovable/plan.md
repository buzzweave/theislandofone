

# VPS Migration + Bug Repair Plan

## 1. Membership Plans — Move to VPS and Fix Saves

**Problem:** `AdminMembershipPlans.tsx` and `useMembershipPlans.ts` currently read/write directly to the Lovable Cloud `membership_plans` table via the Supabase client. The public `Membership.tsx` page also reads from this table.

**Fix:**
- Rewrite `src/hooks/useMembershipPlans.ts` to use `api.get("/api/plans")` instead of `supabase.from("membership_plans")`
- Rewrite `src/pages/admin/AdminMembershipPlans.tsx` to use `api.put("/api/plans/:id", ...)` for updates instead of `supabase.from("membership_plans").update()`
- Add explicit toast error messages showing the server response body on any failure
- Ensure price is sent as a number, features as an array of strings, is_featured as a boolean (normalized to 1/0 integers per your VPS MySQL convention)
- The public `Membership.tsx` page already uses `useMembershipPlans` — after the hook change, it will automatically read from VPS

**VPS endpoints used:**
- `GET /api/plans`
- `POST /api/plans`
- `PUT /api/plans/:id`
- `DELETE /api/plans/:id`

---

## 2. Graphics — Move to VPS

**Problem:** `useGraphics.ts` reads from Supabase `graphics` table. `AdminGraphics.tsx` uploads to Supabase Storage and saves metadata via `graphics-admin` edge function.

**Fix:**
- Rewrite `src/hooks/useGraphics.ts`: public hook uses `api.get("/api/graphics")`, admin hook uses `api.get("/api/graphics")` with admin token
- Rewrite `src/pages/admin/AdminGraphics.tsx`: replace `supabase.storage.from("graphics").upload()` with `api.upload("/api/upload", file)`, replace `adminFetch("graphics-admin", ...)` with `api.post/put/delete("/api/graphics", ...)`
- Public `Graphics.tsx` page uses `useGraphics` — automatically switches after hook change. Stripe checkout stays on Lovable Cloud.

---

## 3. Videos — Move to VPS

**Problem:** `useVideos.ts` reads from Supabase `videos` table. `AdminVideoManager.tsx` uploads thumbnails to Supabase Storage and saves via `videos-admin` edge function.

**Fix:**
- Rewrite `src/hooks/useVideos.ts`: all hooks use `api.get/post/put/delete("/api/videos")`
- Rewrite `src/pages/admin/AdminVideoManager.tsx`: thumbnail upload uses `api.upload("/api/upload", file)` instead of `supabase.storage.from("video-thumbnails")`
- Remove `adminFetch` and `supabase` imports from both files

---

## 4. Blog — Move Remaining Supabase Reads to VPS

**Problem:** `BlogPost.tsx` fetches a single post from Supabase `blog_posts` table. `Index.tsx` fetches homepage blog posts from Supabase. `AdminBlogManager.tsx` uploads images to Supabase Storage.

**Fix:**
- `src/pages/BlogPost.tsx`: replace `supabase.from("blog_posts")` with `api.get("/api/blog")` then filter by slug client-side (or `api.get("/api/blog/slug/${slug}")` if VPS supports it)
- `src/pages/Index.tsx` (lines 29-41): replace Supabase blog query with `api.get("/api/blog")` filtered to published, limited to 3
- `src/pages/admin/AdminBlogManager.tsx`: replace `supabase.storage.from("blog-images").upload()` with `api.upload("/api/upload", file)`

---

## 5. Facebook Share — Use VPS Share Endpoints

**Problem:** All share URLs currently point to Lovable Cloud edge functions (`https://zovakngafdwzbqhwvssf.supabase.co/functions/v1/share-blog?slug=...`). These need to point to your VPS so Facebook crawlers get server-rendered OG tags from your domain.

**VPS share endpoints required (you build these):**
- `GET /share/blog/:slug`
- `GET /share/sermon/:id`
- `GET /share/book/:id`
- `GET /share/video/:id`

Each must return HTML with: `og:title`, `og:description` (excerpt/first 160 chars), `og:image` (absolute HTTPS URL to the featured image), `og:url` (canonical URL), `og:type` (article), `fb:app_id` (1169014871775113), plus `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`. Human visitors should be redirected to the real SPA page after a short delay.

**Frontend changes (4 files, surgical find-and-replace):**

| File | Current URL | New URL |
|------|-------------|---------|
| `BlogPost.tsx` line 116 | `https://zovakngafdwzbqhwvssf.supabase.co/functions/v1/share-blog?slug=${slug}` | `https://theislandofone.com/share/blog/${slug}` |
| `SermonDetail.tsx` line 156 | `https://zovakngafdwzbqhwvssf.supabase.co/functions/v1/share-sermon?id=${id}` | `https://theislandofone.com/share/sermon/${id}` |
| `BookDetail.tsx` line 221 | `https://zovakngafdwzbqhwvssf.supabase.co/functions/v1/share-book?id=${id}` | `https://theislandofone.com/share/book/${id}` |
| `AdminBlogManager.tsx` line 175 | `https://zovakngafdwzbqhwvssf.supabase.co/functions/v1/share-blog?slug=${post.slug}` | `https://theislandofone.com/share/blog/${post.slug}` |

Also update video share buttons in `Videos.tsx` (lines 116-132) to use `https://theislandofone.com/share/video/${video.id}` instead of sharing the raw YouTube URL.

---

## Files Modified (Summary)

| File | Change |
|------|--------|
| `src/hooks/useMembershipPlans.ts` | VPS API via `api` client |
| `src/hooks/useGraphics.ts` | VPS API via `api` client |
| `src/hooks/useVideos.ts` | VPS API via `api` client |
| `src/pages/admin/AdminMembershipPlans.tsx` | VPS API + error toasts |
| `src/pages/admin/AdminGraphics.tsx` | VPS upload + VPS CRUD |
| `src/pages/admin/AdminVideoManager.tsx` | VPS upload + VPS CRUD |
| `src/pages/admin/AdminBlogManager.tsx` | VPS image upload + VPS share URL |
| `src/pages/BlogPost.tsx` | VPS API for single post + VPS share URL |
| `src/pages/Index.tsx` | VPS API for homepage blog |
| `src/pages/SermonDetail.tsx` | VPS share URL |
| `src/pages/BookDetail.tsx` | VPS share URL |
| `src/pages/Videos.tsx` | VPS share URL |

## What Stays on Lovable Cloud

- User authentication (Supabase Auth)
- Stripe checkout and payment verification (edge functions)
- Hero banners, site settings, forum, contact forms
- Facebook Comments Plugin (client-side, no change)

## No UI Changes

All layouts, routes, styles, and components remain exactly as they are. Only the data layer and backend wiring changes.

