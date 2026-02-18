

# Update Default Open Graph Meta Tags

## What This Does
Updates the default OG meta tags in `index.html` to use the specific values you provided. These serve as the fallback for all pages, including blog posts (which then override them dynamically with post-specific data when loaded).

## Changes

### 1. Update `index.html` -- Default OG Tags
Replace the current default OG meta tags with your specified values:
- `og:title` = "The Island of One"
- `og:description` = "Faith, healing, and belonging for the ones who felt alone."
- `og:image` = "https://theislandofone.lovable.app/logo.png" (using your actual domain since the site is hosted there)
- `og:url` = "https://theislandofone.lovable.app"
- `og:type` = "website"

### 2. Update `BlogPost.tsx` -- Dynamic OG Tags for Blog Posts
The dynamic OG tags already work per-post (title, image, excerpt). Will update the fallback description to use "Faith, healing, and belonging for the ones who felt alone." when a post has no excerpt, and ensure `og:image` falls back to the full logo URL when a post has no image.

### 3. Update `share-blog` Edge Function
Update the fallback description in the edge function to match your new default description when a post has no excerpt.

### Files Modified
- `index.html` -- update default OG meta tag values
- `src/pages/BlogPost.tsx` -- improve fallback values for dynamic OG tags
- `supabase/functions/share-blog/index.ts` -- update fallback description

