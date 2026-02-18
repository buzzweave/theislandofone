

# Fix Facebook Blog Sharing -- Show Blog Image + Enable Full Post Sharing

## The Problem
When you share a blog post to Facebook, it shows the site logo instead of the blog's featured image. This happens because Facebook's crawler cannot run JavaScript -- it only reads the raw HTML of the page. Since this is a single-page app, the dynamic OG meta tags set by JavaScript never get seen by Facebook. It always falls back to the default `og:image` which is `/logo.png`.

## The Solution
Create a backend function that serves a special "share page" with the correct blog post image, title, and excerpt baked directly into the HTML. When Facebook's crawler visits this URL, it sees the proper image and text. When a real person clicks the link, it redirects them to the actual blog post on the website (which has copy protection and the comments section).

## What Changes

### 1. New Backend Function: `blog-share`
A backend function that:
- Takes a blog post slug as a parameter
- Fetches the blog post from the database
- Returns a simple HTML page with the correct OG meta tags (title, image, excerpt) hardcoded in the HTML
- Includes a JavaScript redirect so real visitors get sent to the actual blog post page
- Facebook's crawler will see the image, title, and description correctly

### 2. Update Admin Share Button (src/pages/admin/AdminBlogManager.tsx)
Change the Facebook share URL to point to the new backend function URL instead of the direct blog post URL. This way Facebook crawls the backend function (which has proper OG tags) and the link redirects users to the copy-protected blog page.

### 3. Fix Default OG Image (index.html)
Change the default `og:image` from `/logo.png` (relative) to the full absolute URL so it works as a proper fallback.

## How It Works End-to-End

1. You click the Facebook share button on a blog post in Admin
2. Facebook opens a share dialog with the backend function URL
3. Facebook's crawler visits that URL and reads the OG tags -- sees the blog image, title, and excerpt
4. Facebook displays the rich preview card with the correct blog image
5. When someone clicks the shared link on Facebook, they get redirected to the actual blog post page on your website
6. The blog post page has copy protection (no selecting, no right-click) and the Facebook Comments section at the bottom
7. Comments made on the blog page appear on Facebook and vice versa (via the Facebook Comments Plugin already installed)

## Technical Details

### Edge Function: `supabase/functions/blog-share/index.ts`
- Reads slug from query parameter
- Queries `blog_posts` table for the matching published post
- Returns HTML with `og:title`, `og:image`, `og:description`, `og:url` set to the post's actual values
- Includes `<meta http-equiv="refresh">` and JS redirect to `https://theislandofone.lovable.app/blog/{slug}`

### AdminBlogManager.tsx changes
```typescript
const shareToFacebook = (post: BlogPost) => {
  const sharePageUrl = `https://${projectId}.supabase.co/functions/v1/blog-share?slug=${post.slug}`;
  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sharePageUrl)}`;
  window.open(shareUrl, '_blank', 'width=600,height=400');
};
```

### index.html
Update `og:image` to use the full absolute URL.

### Files Modified
- `supabase/functions/blog-share/index.ts` -- new backend function
- `src/pages/admin/AdminBlogManager.tsx` -- update share URL
- `index.html` -- fix default OG image URL

### Note About Copy Protection
The blog content on your website already has copy protection (text selection disabled, right-click blocked, keyboard shortcuts blocked). When people click the Facebook link, they land on the protected blog page. Facebook itself does not allow copying content from shared link previews either -- it only shows the image, title, and a short description.

### Note About Comment Syncing
The Facebook Comments Plugin already installed on your blog posts handles this automatically. Comments made on your website's blog page are Facebook comments -- they appear on Facebook and on your site. No additional syncing is needed.

