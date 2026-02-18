
# Fix Blog Image Display

## Problem
The blog featured image (e.g., "Bruised But Not Broken") is being heavily cropped because the container uses a 16:9 aspect ratio with `object-cover`, which cuts off the bottom portion of images that are more square or portrait-oriented. The title, lamp, and logo are all hidden.

## Solution
Change both the blog post detail page and blog listing cards to display the full image without cropping:

### 1. Blog Post Detail Page (`src/pages/BlogPost.tsx`)
- Remove the forced `aspect-[16/9]` and `max-h-[500px]` constraints
- Switch from `object-cover` to `object-contain` so the entire image is visible
- Use a dark background behind the image so any letterboxing blends with the site theme

### 2. Blog Listing Cards (`src/pages/Blog.tsx`)
- Keep `aspect-[16/9]` on the card thumbnails for a uniform grid layout
- Change to `object-contain` with a dark background so images are fully visible within the card without cropping

## Technical Details

**BlogPost.tsx** -- the featured image container changes from:
```
<div className="w-full aspect-[16/9] max-h-[500px] overflow-hidden">
  <img ... className="w-full h-full object-cover object-center" />
</div>
```
to:
```
<div className="w-full bg-black/40">
  <img ... className="w-full h-auto object-contain max-h-[600px] mx-auto" />
</div>
```

**Blog.tsx** -- the card image container changes from:
```
<div className="aspect-[16/9] overflow-hidden">
  <img ... className="w-full h-full object-cover object-center ..." />
</div>
```
to:
```
<div className="aspect-[16/9] overflow-hidden bg-black/40 flex items-center justify-center">
  <img ... className="w-full h-full object-contain ..." />
</div>
```

This ensures the full image is always visible -- no cropping of titles, logos, or key artwork -- while maintaining a clean layout.
