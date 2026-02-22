

# Fix Facebook Sharing Debugger: Add og:app_id Tag

## Problem
The `share-blog` edge function already includes `fb:app_id` and reads the saved Facebook App ID from `site_settings`. However, it is missing the `og:app_id` meta tag, which Facebook's debugger also looks for.

## Solution
Add one line to the `share-blog` edge function's HTML output:

```
<meta property="og:app_id" content="${fbAppId}" />
```

This goes right after the existing `fb:app_id` line.

## Technical Details

### File: `supabase/functions/share-blog/index.ts`

Add `<meta property="og:app_id" content="${esc(fbAppId)}" />` immediately after the existing `fb:app_id` meta tag (around line 43 of the current file).

No other changes needed -- the function already:
- Reads `fb_app_id` from `site_settings`
- Falls back to `1169014871775113` if not set
- Includes `fb:app_id`
- Preserves all other OG tags and redirect behavior

### Scope
- Only affects `/share/blog/:slug` responses
- No changes to books, sermons, or client-side code
- Edge function will auto-deploy after edit

