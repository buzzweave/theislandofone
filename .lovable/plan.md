

# Fix Facebook Sharing for All Content Types

## Problem

Facebook's scraper hits `https://theislandofone.com/share/blog/:slug`, but this URL serves the SPA's `index.html` (which has NO Open Graph tags). The edge functions with all the correct OG metadata (`fb:app_id`, `og:app_id`, `og:image`, etc.) live at a completely different URL and are never reached by Facebook.

This is why the Debugger shows "Missing Properties: fb:app_id" — it's reading the bare SPA shell, not the edge function HTML.

## Solution

Change all share URLs across the site to point directly to the backend function URLs instead of SPA paths. This ensures Facebook's crawler receives the server-rendered HTML with all OG tags on the first request.

Additionally, add the missing `og:app_id` tag to the `share-book` and `share-sermon` functions for consistency.

## Changes

### 1. Fix share URLs in AdminBlogManager (`src/pages/admin/AdminBlogManager.tsx`)
- Change `getShareUrl()` from `https://theislandofone.com/share/blog/${slug}` to the edge function URL: `https://zovakngafdwzbqhwvssf.supabase.co/functions/v1/share-blog?slug=${slug}`
- Update `openDebugger()` to use the same corrected URL

### 2. Fix share URL in BlogPost page (`src/pages/BlogPost.tsx`)
- Change the `SocialShareLinks` URL prop from `/share/blog/${slug}` to the edge function URL

### 3. Fix share URL in BookDetail page (`src/pages/BookDetail.tsx`)
- Change the `SocialShareLinks` URL prop from `/share/book/${id}` to the edge function URL: `.../share-book?id=${id}`

### 4. Add `og:app_id` to share-book (`supabase/functions/share-book/index.ts`)
- Add `<meta property="og:app_id" content="${esc(fbAppId)}" />` after the existing `fb:app_id` line

### 5. Add `og:app_id` to share-sermon (`supabase/functions/share-sermon/index.ts`)
- Add `<meta property="og:app_id" content="${esc(fbAppId)}" />` after the existing `fb:app_id` line

## Technical Note
The edge function URLs will be constructed using `import.meta.env.VITE_SUPABASE_URL` (which resolves to the project's backend URL) so they stay dynamic and don't break if the project changes. The pattern is: `${VITE_SUPABASE_URL}/functions/v1/share-blog?slug=${slug}`.

## Result
After this change, when Facebook scrapes any shared link, it will hit the edge function directly and receive proper HTML with `fb:app_id`, `og:app_id`, `og:image`, `og:title`, and all other tags — then redirect human visitors to the real page.

