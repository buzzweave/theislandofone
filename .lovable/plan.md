
# Make Blog Posts Readable Like Books

## Problem
The blog post content on the detail page has several issues visible in the screenshot:
- Text is grey/muted instead of white -- hard to read on the dark background
- Each sentence appears as its own line instead of being grouped into proper paragraphs
- The first paragraph that just repeats the title ("The Preacher's Wife") is not removed
- No drop cap on the first letter like the book reader has
- No punctuation fixing or sentence merging

## Solution
Apply the same reading experience from the book reader to blog posts -- reuse the paragraph extraction logic, punctuation fixing, drop cap styling, and white text.

### 1. BlogPost.tsx -- Rewrite content rendering
- Import and reuse the same `extractParagraphs` and `fixPunctuation` logic from the book reader (or extract it into a shared utility)
- Skip the first paragraph if it just repeats the post title
- Render with drop cap on the first paragraph
- Use white text color instead of the muted prose styling

### 2. CSS (index.css) -- Add blog content typography
- Add a `.blog-post-prose` class mirroring the book reader prose style but adapted for the dark background
- White text color (#ffffff) instead of dark (#1a1a1a)
- Drop cap styled in gold (matching the site's primary color) instead of burgundy
- Same Georgia serif font, proper line-height and text-indent

### 3. Title deduplication
- If the first extracted paragraph matches the blog post title, skip it (same logic as book reader)

## Technical Details

### New shared utility: `src/lib/textFormat.ts`
Extract `fixPunctuation`, `extractParagraphs`, and `formatPlainText` from `ReaderChapterContent.tsx` into a shared module so both the book reader and blog post can use them.

### BlogPost.tsx changes
- Import `extractParagraphs` from the shared utility
- Replace the current `prose` div with a custom `.blog-post-prose` container
- Map paragraphs with drop cap on the first one and proper `<p>` tags
- Skip title-duplicate first paragraph

### index.css additions
```css
.blog-post-prose {
  font-family: Georgia, "Times New Roman", serif;
  line-height: 1.9;
  max-width: 720px;
  margin: 0 auto;
}

.blog-post-prose p {
  text-indent: 1.5em;
  margin: 1.1em 0;
  text-align: left;
  font-size: 1.08rem;
  color: #ffffff;
}

.blog-post-prose p:first-of-type {
  text-indent: 0;
}

.blog-post-prose p.blog-drop-cap::first-letter {
  float: left;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 3.8em;
  line-height: 0.8;
  padding-right: 0.08em;
  padding-top: 0.05em;
  color: hsl(40 72% 52%);
  font-weight: bold;
}
```

### ReaderChapterContent.tsx update
- Import `extractParagraphs` from the shared utility instead of defining it inline
- Remove the duplicated function definitions

### Files to create
- `src/lib/textFormat.ts` -- shared paragraph extraction and punctuation logic

### Files to modify
- `src/pages/BlogPost.tsx` -- new content rendering with drop cap and white text
- `src/index.css` -- blog post prose styles
- `src/components/reader/ReaderChapterContent.tsx` -- import from shared utility
