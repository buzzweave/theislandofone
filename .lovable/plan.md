
# Fix Facebook Link Previews for Blog Posts

## Problem
Facebook (and iMessage/LinkedIn) crawlers do not execute JavaScript. The current `share-blog` edge function already serves server-rendered OG tags, but is missing critical tags (`og:image:width`, `og:image:height`, `twitter:title`, `twitter:description`) and the `meta refresh` fires instantly (`content="0"`) which some crawlers may not handle well.

## Changes

### 1. Update `share-blog` Edge Function (`supabase/functions/share-blog/index.ts`)
Add the missing meta tags and improve crawler compatibility:
- Add `og:image:width=1200` and `og:image:height=630`
- Add `twitter:title` and `twitter:description`
- Change meta refresh delay from `0` to `2` seconds (gives crawlers time to read tags)
- Ensure `og:image` always uses an absolute URL
- Add a default fallback image URL when post has no image (use the site logo as fallback with full absolute URL)
- Escape all user content properly in meta tag values to prevent HTML injection

### 2. Add "Refresh Share Cache" Button in Admin (`src/pages/admin/AdminBlogManager.tsx`)
Add a button next to the Facebook share button that opens the Facebook Sharing Debugger with the post's share URL pre-filled. This lets admins click "Scrape Again" to refresh Facebook's cached preview after updating a post.

### 3. Update Admin Share URL
The current `shareToFacebook` function already uses the edge function URL -- will keep that pattern but also add the debugger button.

### 4. Update Default OG Image in `index.html`
Set `twitter:image` to the full absolute logo URL (currently empty).

## Technical Details

### Edge Function Meta Tags (share-blog)
The HTML response will include these tags in the `<head>`:

```
og:title = post title
og:description = post excerpt or default
og:image = post image_url (absolute) or fallback logo
og:image:width = 1200
og:image:height = 630
og:url = canonical blog post URL
og:type = article
og:site_name = The Island of One
twitter:card = summary_large_image
twitter:title = post title
twitter:description = post excerpt or default
twitter:image = same as og:image
```

### Admin Debugger Button
A new button per published post that opens:
```
https://developers.facebook.com/tools/debug/?q={encoded_share_url}
```
This lets you scrape again after any content or image changes.

### Files Modified
- `supabase/functions/share-blog/index.ts` -- add missing OG/Twitter tags, fix meta refresh delay
- `src/pages/admin/AdminBlogManager.tsx` -- add Facebook Debugger button
- `index.html` -- set twitter:image fallback

### Note on Image Format
Facebook supports JPG, PNG, and WebP for OG images. Since your images are stored on public storage buckets, they should already return HTTP 200 to crawlers. No image conversion is needed unless you encounter specific issues with WebP on older platforms.
