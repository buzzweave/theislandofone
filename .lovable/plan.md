

# Fix Facebook Preview for Blog Posts

## The Constraint (Important Context)

This is a React Single Page Application. Lovable's hosting serves the same static `index.html` for every URL. There is no server-side rendering available. When Facebook crawls `theislandofone.com/blog/failure-are-not-final`, it receives generic `index.html` with the default logo OG tags -- it never runs JavaScript to see the dynamic post-specific tags.

**This cannot be changed within this stack.** The `share-blog` backend function is the correct and only solution for server-rendered OG tags.

## What Needs Fixing

Two specific issues are causing the wrong preview:

1. **Wrong domain in the edge function**: The canonical URL and `og:url` currently point to `theislandofone.lovable.app` instead of `theislandofone.com`. This causes Facebook to show the wrong domain.

2. **Sharing flow**: When you or visitors copy/share a blog post link, it needs to use the edge function URL (not the browser URL) so Facebook's crawler hits the server-rendered page with correct OG tags.

## How It Will Work After the Fix

1. You paste the share link into Facebook
2. Facebook crawls: `https://zovakngafdwzbqhwvssf.supabase.co/functions/v1/share-blog?slug=failure-are-not-final`
3. Facebook receives server-rendered HTML with the post's title, excerpt, and featured image in OG tags
4. Facebook sees `og:url` = `https://theislandofone.com/blog/failure-are-not-final` and displays YOUR domain (not the backend domain)
5. When someone clicks the link on Facebook, the 2-second meta refresh sends them to the real blog post on your site

## Changes

### 1. Update Edge Function Domain (`supabase/functions/share-blog/index.ts`)
- Change `const site` from `https://theislandofone.lovable.app` to `https://theislandofone.com`
- This fixes `og:url`, `canonical`, and the redirect target to use your custom domain

### 2. Update BlogPost Share URL (`src/pages/BlogPost.tsx`)
- Already passes the edge function URL to SocialShareLinks (done in last edit)
- Update the `og:url` in the client-side useEffect to also use `theislandofone.com`

### 3. Update SocialShareLinks Copy Behavior
- Already uses the passed URL prop -- no changes needed here

## Files Modified
- `supabase/functions/share-blog/index.ts` -- update domain from `.lovable.app` to `.com`
- `src/pages/BlogPost.tsx` -- update client-side og:url to use `.com` domain

## After Deployment: Verification Steps
1. Open Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
2. Enter: `https://zovakngafdwzbqhwvssf.supabase.co/functions/v1/share-blog?slug=failure-are-not-final`
3. Click "Scrape Again" -- you should see the post title, excerpt, and featured image
4. The "Link Preview" section should show `theislandofone.com` as the domain

## Important Note
The **original URL** (`theislandofone.com/blog/failure-are-not-final`) will still show the default logo when pasted directly into Facebook, because it serves the SPA's static HTML. The solution is to always share using the edge function URL (which the Share buttons and Copy Link button already do). Facebook will display your custom domain in the preview because of the `og:url` and `canonical` tags.
