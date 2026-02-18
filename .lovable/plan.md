

# Add Copyright Protection to Website Content

## What This Does
1. Adds a visible copyright notice at the bottom of every blog post
2. Disables text copying (select, copy, right-click) across all content pages -- blogs, books, and sermons

## Changes

### 1. Global Copy Protection (src/index.css)
Add CSS rules to disable text selection on content areas site-wide:
- `user-select: none` on blog prose, sermon content, and book chapter content
- Disable right-click context menu on these areas
- Keep navigation and UI elements selectable (only protect the written content)

### 2. Copy Protection Script (src/components/Layout.tsx)
Add a `useEffect` that prevents:
- Right-click context menu on the page
- Ctrl+C / Cmd+C keyboard shortcuts
- Ctrl+A / Cmd+A select-all shortcuts
This makes it significantly harder to copy text from the site.

### 3. Copyright Notice on Blog Posts (src/pages/BlogPost.tsx)
Add a visible copyright line at the bottom of every blog post, above the social share links:

> (c) 2026 The Island of One Ministries. All rights reserved. For personal use only.

Styled in small muted text matching the site design.

### 4. Copyright Notice on Sermon Detail (src/pages/SermonDetail.tsx)
Add the same copyright notice at the end of the sermon manuscript content.

### 5. Copyright Notice on Book Detail (src/pages/BookDetail.tsx)
Add the copyright notice at the bottom of the chapter content area.

## Technical Details

### CSS additions (index.css)
```css
.blog-post-prose,
.sermon-content,
.book-chapter-content,
.book-reader-shell {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
```

### Layout.tsx -- global keyboard/right-click protection
```typescript
useEffect(() => {
  const handleContextMenu = (e: MouseEvent) => e.preventDefault();
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'a' || e.key === 'u')) {
      e.preventDefault();
    }
  };
  document.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('keydown', handleKeyDown);
  return () => {
    document.removeEventListener('contextmenu', handleContextMenu);
    document.removeEventListener('keydown', handleKeyDown);
  };
}, []);
```

### Copyright component text
A small reusable line added to BlogPost.tsx, SermonDetail.tsx, and BookDetail.tsx:
```
(c) {year} The Island of One Ministries. All rights reserved. For personal use only.
```

### Files Modified
- `src/index.css` -- CSS user-select rules
- `src/components/Layout.tsx` -- global copy/right-click prevention
- `src/pages/BlogPost.tsx` -- copyright notice
- `src/pages/SermonDetail.tsx` -- copyright notice
- `src/pages/BookDetail.tsx` -- copyright notice

