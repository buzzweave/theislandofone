

# Fix Facebook Link Previews for Blog Posts

## The Core Issue

This is a React Single Page Application (SPA) hosted on Lovable. When Facebook's crawler visits any URL on your site (e.g., `https://theislandofone.lovable.app/blog/my-post`), it receives the same `index.html` file with generic default OG tags. Facebook does not run JavaScript, so it never sees the post-specific tags your app sets dynamically. This is a fundamental limitation of all SPAs -- it cannot be fixed by adding more client-side code.

**You cannot server-render per-post OG tags on the original blog URLs** without a server-side rendering framework (like Next.js), which is not available in this stack.

## The Solution

The `share-blog` backend function already exists and works perfectly for this purpose -- it serves a dedicated HTML page with the correct post-specific OG tags baked in, then redirects real visitors to the actual blog post. **This is the correct architecture.**

The fix is to make this the standard sharing workflow everywhere -- not just in Admin, but also on the public blog post pages. When anyone shares a post (on Facebook, iMessage, LinkedIn, etc.), they should share the backend function URL, which:
1. Shows Facebook the correct title, image, and description
2. Redirects real visitors to the full blog post page (with copy protection and comments)

## What Changes

### 1. Update `share-blog` Edge Function
- Add `<link rel="canonical">` tag pointing to the real blog post URL (prevents Facebook from showing the Supabase domain)
- Ensure `og:url` points to the real blog post URL (already done, but will verify)
- No content/body in the share page -- only OG tags and redirect (keeps it lightweight for crawlers)

### 2. Add "Copy Share Link" on Public Blog Post Pages (`src/pages/BlogPost.tsx`)
Add a "Copy Link" button alongside the existing social share links. This copies the backend function URL (the one Facebook can read) so visitors and the author can paste it anywhere -- Facebook, iMessage, LinkedIn, WhatsApp -- and it will always show the correct preview.

### 3. Update `SocialShareLinks` Component (`src/components/SocialShareLinks.tsx`)
Pass the backend function share URL as the URL for Facebook sharing (instead of the current page URL). This ensures that when anyone clicks "Share on Facebook" from the blog post page, the shared URL goes through the backend function.

### 4. Clean Up Edge Function HTML
Remove the full blog content from the share page body. It should only contain:
- OG meta tags in the head
- A brief loading message ("Redirecting to The Island of One...")
- The meta refresh redirect
This makes the page fast to load and prevents content duplication.

## How It Works

1. Someone clicks "Share on Facebook" or "Copy Share Link" on a blog post
2. The shared URL is: `https://zovakngafdwzbqhwvssf.supabase.co/functions/v1/share-blog?slug=my-post`
3. Facebook crawls that URL and reads the OG tags -- sees the correct blog image, title, and excerpt
4. Facebook displays the rich preview card with the blog image
5. `og:url` and `canonical` both point to `https://theislandofone.lovable.app/blog/my-post` so Facebook shows your domain (not the Supabase domain)
6. When someone clicks the link on Facebook, the meta refresh redirects them to the real blog post

## Technical Details

### Files Modified
- `supabase/functions/share-blog/index.ts` -- add canonical link, remove body content, keep only OG tags + redirect
- `src/pages/BlogPost.tsx` -- pass share URL to SocialShareLinks
- `src/components/SocialShareLinks.tsx` -- accept and use a custom share URL for Facebook

### Edge Function Changes
```text
Added:  <link rel="canonical" href="{blog_post_url}">
Removed: Full blog content from <body> (unnecessary for crawlers)
Kept:   All OG + Twitter meta tags, meta refresh redirect
```

### Why This Is the Right Approach
- Facebook, iMessage, and LinkedIn all use the same OG tag system
- The backend function guarantees correct tags because it fetches post data and bakes it into HTML
- `og:url` and `canonical` tell Facebook to display your domain, not the function URL
- Real visitors get redirected to the full, copy-protected blog page automatically

