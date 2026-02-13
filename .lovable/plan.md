

# Fix: White Text in Rich Text Editor Body and Content Pages

## Problem

The rich text editor's body area shows near-invisible text because it uses `dark:prose-invert` (which requires a `dark` class on the HTML element) instead of `prose-invert` (which applies unconditionally). Since the site is always in dark mode without a `dark` class toggle, the prose inversion never activates, leaving text in default dark colors.

Additionally, the sermon detail page has an HTML nesting issue where `renderContent()` returns a `<p>` or `<div>` inside another `<p>` tag, which can cause rendering inconsistencies.

## Changes

### 1. `src/components/admin/RichTextEditor.tsx` (line 588)

Change `dark:prose-invert` to `prose-invert` in the editor's `editorProps.attributes.class` so that text always renders as white in the editor body.

### 2. `src/pages/SermonDetail.tsx` (lines 141-146)

- Fix the content rendering: the `renderContent()` function returns markup that gets nested inside a `<p>` tag, causing invalid HTML. Change the wrapper from `<p>` to `<div>` to prevent nesting issues and ensure white text renders correctly.

### 3. `src/index.css` -- already fixed

The `.ProseMirror { color: hsl(var(--foreground)); }` rule added in the last edit provides a baseline white color. Combined with switching to `prose-invert`, this ensures full coverage.

No other files need changes.

