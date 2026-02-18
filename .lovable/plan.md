
# Add Facebook Comments to Blog Posts

## What This Does
Embeds the Facebook Comments Plugin at the bottom of every blog post, allowing visitors to leave comments using their Facebook account. Comments are tied to your Facebook page (facebook.com/customwebdesigners).

## How It Works
Facebook provides a free embeddable comments widget. We load the Facebook SDK once, then place a `<div class="fb-comments">` element on each blog post page. Facebook handles all the comment rendering, moderation, and notifications through your Facebook page.

## Changes

### 1. Load Facebook SDK (index.html)
Add the Facebook JavaScript SDK script to the page. This is required for the comments plugin to render. It uses your Facebook App ID (we'll use your page URL as the identifier).

### 2. Facebook Comments Component (src/components/FacebookComments.tsx)
Create a reusable component that:
- Renders the `fb-comments` div with the current page URL
- Re-initializes the Facebook SDK when the blog post slug changes (since this is a single-page app, we need to tell Facebook to re-parse the comments div on navigation)
- Configurable width (100%) and number of visible comments

### 3. Add to Blog Post Page (src/pages/BlogPost.tsx)
Place the Facebook Comments component below the social share links, after the copyright notice.

## Technical Details

### index.html -- Facebook SDK script
```html
<div id="fb-root"></div>
<script async defer crossorigin="anonymous"
  src="https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v21.0"
  nonce="random123">
</script>
```

### FacebookComments.tsx -- Reusable component
```typescript
// Uses useEffect to call FB.XFBML.parse() when slug changes
// Renders: <div class="fb-comments" data-href={pageUrl} data-width="100%" data-numposts="5" />
```

### BlogPost.tsx -- Integration point
The comments section will appear below the social share links, styled to match the dark theme with a "Comments" heading.

### Files Modified
- `index.html` -- add Facebook SDK
- `src/components/FacebookComments.tsx` -- new component
- `src/pages/BlogPost.tsx` -- embed comments below share links

### Important Note
Facebook Comments will only render on a publicly accessible URL (the published site at theislandofone.lovable.app or a custom domain). They won't appear in the local preview. After publishing, comments will be visible and linked to your Facebook page for moderation.
