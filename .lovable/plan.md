
# Publish Blog Posts to Facebook

## What This Does
Adds a "Share to Facebook" button next to each blog post in the Admin Blog Manager. When clicked, it opens the Facebook Share Dialog with:
- The blog post URL (which Facebook crawls for the title, image, and description)
- A pre-filled quote from the post excerpt

It also sets dynamic Open Graph meta tags on each blog post page so Facebook picks up the correct title, image, and description when the link is shared.

## How Facebook Sharing Works
Facebook does not allow apps to upload images directly into a user's post via a simple share button. Instead, when you share a URL, Facebook crawls that URL and pulls the Open Graph meta tags (og:title, og:image, og:description) to build the rich preview card with the picture.

This means the blog post pages need proper OG meta tags set dynamically, and then the Facebook Share Dialog will display the post with its featured image automatically.

## Changes

### 1. Dynamic Open Graph Meta Tags (src/pages/BlogPost.tsx)
Add a `useEffect` that updates the page's `<meta>` OG tags when a blog post loads:
- `og:title` -- the post title
- `og:description` -- the post excerpt
- `og:image` -- the post featured image URL
- `og:url` -- the canonical URL of the post
- `og:type` -- "article"

This ensures Facebook sees the correct image and text when it crawls the shared link.

### 2. Share to Facebook Button in Admin (src/pages/admin/AdminBlogManager.tsx)
Add a Facebook share icon button next to the Edit and Delete buttons on each post row. Clicking it opens:
```
https://www.facebook.com/sharer/sharer.php?u={encoded_blog_post_url}&quote={encoded_excerpt}
```
in a new window. This is the standard Facebook Share Dialog -- it opens the "Create post" window (like in your screenshot) with the blog post link pre-attached, showing the image and title from the OG tags.

Only published posts will show the share button (drafts are not publicly accessible).

### 3. Update Default OG Image (index.html)
Set a default `og:image` to `/logo.png` so pages without a specific image still have a fallback.

## Technical Details

### BlogPost.tsx -- dynamic meta tags
```typescript
useEffect(() => {
  if (!post) return;
  const setMeta = (property: string, content: string) => {
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el); }
    el.setAttribute('content', content);
  };
  const url = `https://theislandofone.lovable.app/blog/${slug}`;
  setMeta('og:title', post.title);
  setMeta('og:description', post.excerpt || '');
  setMeta('og:image', post.image_url || '');
  setMeta('og:url', url);
  setMeta('og:type', 'article');
  document.title = `${post.title} | The Island of One`;
}, [post, slug]);
```

### AdminBlogManager.tsx -- share button
```typescript
const shareToFacebook = (post: BlogPost) => {
  const url = `https://theislandofone.lovable.app/blog/${post.slug}`;
  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(post.excerpt || post.title)}`;
  window.open(shareUrl, '_blank', 'width=600,height=400');
};
```
A Facebook icon button will be added to each published post's action buttons.

### Files Modified
- `src/pages/BlogPost.tsx` -- add dynamic OG meta tags via useEffect
- `src/pages/admin/AdminBlogManager.tsx` -- add Facebook share button per post
- `index.html` -- set default og:image to /logo.png
