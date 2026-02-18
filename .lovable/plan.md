

# Add Facebook App ID to share-blog Edge Function

## What Changes

### `supabase/functions/share-blog/index.ts`
Add a single meta tag to the OG tags section:

```html
<meta property="fb:app_id" content="1169014871775113" />
```

This will be inserted alongside the existing OG meta tags in the HTML template. No other files need to change.

## After Deployment
Go to the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/), paste the share URL, and click "Scrape Again" -- the `fb:app_id` warning should be gone.

