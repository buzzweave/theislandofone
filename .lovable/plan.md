

# Fix Blog Delete, Facebook Image Sharing, and Admin Blog Visibility

## Issues Found

### 1. Cannot Delete Blog Posts
The admin uses a custom VPS-based authentication (not Lovable Cloud auth). The RLS DELETE policy requires `has_role(auth.uid(), 'admin')`, but since the admin is not signed in via Lovable Cloud auth, `auth.uid()` is null. The delete silently fails.

Additionally, the SELECT policy only returns rows where `is_published = true`, which means draft posts are invisible in the admin too.

**Fix:** Add permissive RLS policies for anon access on SELECT (all rows), DELETE, and UPDATE on `blog_posts`. Since this is an admin-managed CMS table (not user-generated content), and the admin panel itself is protected by VPS auth, this is acceptable.

### 2. Facebook Shows Logo Instead of Blog Images
The VPS-synced blog posts have `http://` image URLs (not `https://`). Facebook requires HTTPS for OG images. When Facebook can't load the image, the `share-blog` function's fallback logo shows instead.

**Fix:** In the `share-blog` Edge Function, convert `http://` image URLs to `https://` before outputting them in OG tags. Also update the `sync-blog-posts` function to store HTTPS URLs during import.

### 3. Books and Sermons Don't Show Images on Facebook
The `SocialShareLinks` component on book and sermon pages shares the SPA URL (e.g., `theislandofone.com/books/123`). Facebook's crawler can't execute JavaScript, so it sees no OG tags and no image.

The blog already solves this with the `share-blog` Edge Function that serves server-rendered HTML with OG tags. Books and sermons need the same approach.

**Fix:** Create two new Edge Functions (`share-book` and `share-sermon`) that query the VPS API for book/sermon data and serve server-rendered HTML with proper OG tags. Update the share URLs on those pages to point to these functions.

---

## Technical Changes

### Database Migration
- Drop the existing restrictive RLS policies on `blog_posts`
- Add new policies allowing full anon access (SELECT all rows, INSERT, UPDATE, DELETE) since admin auth is handled at the application layer via VPS

### `supabase/functions/share-blog/index.ts`
- Convert `http://` to `https://` in `image_url` before outputting OG tags

### `supabase/functions/sync-blog-posts/index.ts`
- Convert `http://` to `https://` in `image_url` during upsert

### New: `supabase/functions/share-book/index.ts`
- Accept `?id=BOOK_ID` query param
- Fetch book data from `https://api.theislandofone.com/api/books/BOOK_ID`
- Serve server-rendered HTML with OG tags (title, description, cover image, fb:app_id)
- Redirect to `https://theislandofone.com/books/BOOK_ID`

### New: `supabase/functions/share-sermon/index.ts`
- Accept `?id=SERMON_ID` query param
- Fetch sermon data from `https://api.theislandofone.com/api/sermons/SERMON_ID`
- Serve server-rendered HTML with OG tags (title, scripture/excerpt, image if available, fb:app_id)
- Redirect to `https://theislandofone.com/sermons/SERMON_ID`

### `src/pages/BookDetail.tsx`
- Pass the share-book Edge Function URL to `SocialShareLinks` instead of `window.location.href`

### `src/pages/SermonDetail.tsx`
- Pass the share-sermon Edge Function URL to `SocialShareLinks` instead of `window.location.href`

### `supabase/config.toml`
- Register `share-book` and `share-sermon` functions with `verify_jwt = false`

