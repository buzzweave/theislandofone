

# Fix: Rich Text Editor Default Text Color to White

## Problem

The rich text editor (TipTap) renders typed text in a dark/gray color that's nearly invisible against the dark background. The screenshot shows "dddddd" barely visible.

## Solution

Add a CSS rule to force the TipTap editor's content area to use white text by default.

## Technical Details

**File: `src/index.css`**

Add a global style targeting the ProseMirror editor content area to set the default text color to white:

```css
.ProseMirror {
  color: white;
}
```

This ensures all text typed in the rich text editor defaults to white, matching the site's dark theme. Users can still override with the color picker toolbar button.

No other files need changes.

