

# System-Wide Bug Fix and Content Publishing Restore

## Summary

This plan addresses six areas: graphics upload fix, video publishing fix, blog homepage featuring, Facebook sharing verification, navbar cleanup, and general hardening. Based on thorough investigation, here is the current state and what needs to change.

---

## Current State Assessment

**Graphics**: Edge functions (graphics-admin) are working correctly. The upload pipeline uses Supabase Storage (public bucket) for files, then calls `graphics-admin` POST to insert metadata. The `adminFetch` utility correctly sends the `x-admin-token`. All 12 graphics are in the database with valid URLs. The admin page code looks correct. The RLS error in postgres logs (`new row violates row-level security policy for table "graphics"`) is from a previous version before the edge function proxy was implemented -- the current code should work.

**Videos**: Edge function (videos-admin) is working correctly. Videos are stored in Supabase with valid YouTube URLs. The admin code uses `adminFetch` correctly. All videos show `is_free: true` and `price: 0`. The public Videos page renders YouTube embeds properly.

**Blog**: Blog data lives in both the VPS MySQL (primary) and Supabase (synced via `sync-blog-posts`). The admin creates/updates via VPS API (`api.post("/api/blog")`). The public Blog page fetches from VPS API too. But `BlogPost.tsx` fetches individual posts from Supabase directly. The homepage has NO blog section.

**Facebook Sharing**: The `share-blog` edge function works correctly -- it returns proper OG tags with the blog post's image (not the site logo). However, the Content-Type header is returned as `text/plain` instead of `text/html` which may prevent Facebook's crawler from parsing it.

**Navbar**: "Community" link is present on line 17 of Layout.tsx.

---

## Changes

### A) Graphics Upload Fix

The current code already routes uploads through Supabase Storage + `graphics-admin` edge function. The remaining RLS errors in logs are stale (from before the fix). However, the upload path in `AdminGraphics.tsx` saves files to `graphics/{uuid}.{ext}` but older graphics used `graphics/previews/` and `graphics/files/` subpaths. To ensure consistency and confirm the fix works:

1. **Add error logging to `AdminGraphics.tsx`**: Add `console.error` in the upload catch block so failures are visible in the browser console.
2. **Ensure `adminFetch` throws on non-200**: Already does this -- the current code throws if `!res.ok`.
3. **No structural changes needed** -- the pipeline is already correct.

### B) Video Publishing Fix

The video admin code already uses the `videos-admin` edge function. Testing confirms it returns 200 with all videos. The form validation only requires `title` and `category`, not price or thumbnail. Price defaults to 0 and `is_free` defaults to true.

1. **Fix `handleSave` validation**: Currently blocks save if `!form.title || !form.category`. The `youtube_url` is not validated, which could allow empty URLs. Add a check that at least one URL field is provided, but do NOT block on optional fields.
2. **Add console logging for save errors** so failures are visible.

### C) Blog Posts + Featured Homepage

The blog system works via VPS API. Blog posts exist in Supabase (synced). The homepage needs a blog section.

1. **Add "Latest Blog Posts" section to `Index.tsx`**: Query `blog_posts` from Supabase (published only), show the 3 most recent posts with image, title, excerpt, and link to `/blog/{slug}`.
2. **No changes to blog admin** -- it already works through the VPS API. The admin manager (`AdminBlogManager.tsx`) creates posts via VPS and syncs to Supabase.

### D) Facebook Sharing Fix

The `share-blog` edge function already returns correct OG tags with the blog post image. The only issue is the `Content-Type` header may be overridden.

1. **Fix Content-Type in `share-blog`**: Ensure the response explicitly sets `Content-Type: text/html; charset=utf-8` and not `text/plain`.
2. **No other changes needed** -- the OG tags are already correct (verified by testing the edge function directly).

### E) Global Bug Sweep

1. **Verify `adminFetch` error handling**: Already throws meaningful errors. Add a try/catch wrapper in `AdminGraphics` and `AdminVideoManager` save flows to show toast notifications on failure.
2. **Storage bucket permissions**: All relevant buckets (`graphics`, `video-thumbnails`, `blog-images`) are already public. No changes needed.

### F) Navbar Change

1. **Remove "Community" from `navLinks` array** in `Layout.tsx` (line 17). This removes it from both desktop and mobile navigation, and from the footer "Explore" section.

---

## Files to Change

| File | Change |
|------|--------|
| `src/components/Layout.tsx` | Remove Community from navLinks |
| `src/pages/Index.tsx` | Add Latest Blog Posts section |
| `supabase/functions/share-blog/index.ts` | Fix Content-Type header to text/html |
| `src/pages/admin/AdminGraphics.tsx` | Add console.error logging in upload catch |
| `src/pages/admin/AdminVideoManager.tsx` | Add console.error logging in save catch |

## Technical Details

### Navbar (Layout.tsx)
Remove line 17: `{ to: "/community", label: "Community" },`

### Homepage Blog Section (Index.tsx)
- Import `useBlogPosts` from hooks
- Add a section after Featured Sermons showing 3 latest published blog posts
- Each card shows image, title, excerpt, author, date with link to `/blog/{slug}`
- Only renders if there are published posts

### Share-Blog Content-Type Fix
The corsHeaders spread may be overriding the Content-Type. Ensure the final Response uses:
```
headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" }
```

### Error Logging
Add `console.error("Graphics upload failed:", err)` and `console.error("Video save failed:", err)` in the respective catch blocks to make failures visible in the browser console for future debugging.

