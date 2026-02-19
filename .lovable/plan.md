

# VPS Migration + Bug Repair Plan — COMPLETED

All items below have been implemented.

## 1. Membership Plans ✅
- `useMembershipPlans.ts` → VPS `api.get("/api/plans")`
- `AdminMembershipPlans.tsx` → VPS `api.put("/api/plans/:id")` with boolean→int normalization and error toasts

## 2. Graphics ✅
- `useGraphics.ts` → VPS `api.get("/api/graphics")` for both public and admin
- `AdminGraphics.tsx` → VPS `api.upload("/api/upload")` + `api.post/put/delete("/api/graphics/:id")`

## 3. Videos ✅
- `useVideos.ts` → VPS `api.get/post/put/delete("/api/videos")`
- `AdminVideoManager.tsx` → VPS `api.upload("/api/upload")` for thumbnails

## 4. Blog ✅
- `BlogPost.tsx` → VPS `api.get("/api/blog")` filtered by slug
- `Index.tsx` → VPS `api.get("/api/blog")` for homepage posts
- `AdminBlogManager.tsx` → VPS `api.upload("/api/upload")` for images

## 5. Facebook Share URLs ✅
- `BlogPost.tsx` → `https://theislandofone.com/share/blog/${slug}`
- `SermonDetail.tsx` → `https://theislandofone.com/share/sermon/${id}`
- `BookDetail.tsx` → `https://theislandofone.com/share/book/${id}`
- `AdminBlogManager.tsx` → `https://theislandofone.com/share/blog/${post.slug}`
- `Videos.tsx` → `https://theislandofone.com/share/video/${video.id}`

## 6. Service Worker Cache Fix ✅
- `vite.config.ts` → `skipWaiting: true`, `clientsClaim: true`
- `main.tsx` → auto-reload on SW controller change

## What Stays on Lovable Cloud
- User authentication (Supabase Auth)
- Stripe checkout and payment verification (edge functions)
- Hero banners, site settings, forum, contact forms
- Facebook Comments Plugin (client-side)

## VPS Share Endpoints Required (server-side)
Your VPS must serve these routes returning HTML with OG tags:
- `GET /share/blog/:slug`
- `GET /share/sermon/:id`
- `GET /share/book/:id`
- `GET /share/video/:id`
