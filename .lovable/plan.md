

# Fix: Bullet Points Not Working in Rich Text Editor

## Root Cause

The `@tailwindcss/typography` plugin is installed in `package.json` but is **not registered** in the Tailwind config's `plugins` array (`tailwind.config.ts`, line 90).

The editor applies `prose prose-sm dark:prose-invert` classes to format content, but since the typography plugin is not active, those classes do nothing. Tailwind's base reset (`preflight`) strips all default list styles (`list-style: none`), and without the `prose` styles to restore them, bullet points and numbered lists render as unstyled plain text -- no bullet dots, no numbers.

## Fix

**File: `tailwind.config.ts` (line 90)**

Add `@tailwindcss/typography` to the plugins array:

```typescript
// Before
plugins: [require("tailwindcss-animate")],

// After
plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
```

This single-line change will:
- Activate the `prose` class throughout the app
- Restore bullet points (disc markers) for `ul` lists
- Restore numbering for `ol` lists
- Properly style blockquotes, headings, links, and all other prose elements inside the editor
- Apply `dark:prose-invert` for correct colors in dark mode

No other files need to change.

