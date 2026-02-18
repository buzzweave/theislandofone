

# Update share-blog Edge Function to Use VPS API

## Problem
The `share-blog` Edge Function queries the Lovable Cloud database, which only has 1 blog post. Your actual blog posts live on the VPS API at `api.theislandofone.com`. This is why Facebook shows the logo instead of the featured image for most posts.

## Solution
Update the Edge Function to fetch post data from your VPS API -- the same source your live blog page uses.

## What Changes

### `supabase/functions/share-blog/index.ts`
- Remove the database client import and database query
- Replace with a `fetch()` call to `https://api.theislandofone.com/api/blog-posts/by-slug/{slug}`
- Everything else stays the same: OG tags, canonical URL, redirect, fallback image

## How It Will Work

1. Facebook crawls the share URL
2. Edge Function calls your VPS API to get the post's title, excerpt, and image_url
3. Returns server-rendered HTML with the correct OG tags and featured image
4. Facebook displays the proper preview with your domain (`theislandofone.com`)

## After Deployment
1. Open Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
2. Enter: `https://zovakngafdwzbqhwvssf.supabase.co/functions/v1/share-blog?slug=failure-are-not-final`
3. Click "Scrape Again" -- you should see the post's featured image, title, and excerpt

## Technical Detail

```text
Before:
  import { createClient } from supabase
  supabase.from("blog_posts").select(...).eq("slug", slug)

After:
  const res = await fetch("https://api.theislandofone.com/api/blog-posts/by-slug/" + slug)
  const post = await res.json()
```

No other files need to change. The BlogPost page, SocialShareLinks, and Copy Link button already use the correct share URL pattern.
