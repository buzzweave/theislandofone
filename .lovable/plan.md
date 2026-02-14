

# Fix: Sermon Page Crash

## Problem

The sermons page shows a blank screen because it crashes with the error:
**`sermon.price?.toFixed is not a function`**

The API returns `price` as a string (e.g. `"0.00"`) but the code calls `.toFixed(2)` on it, which only works on numbers.

## Solution

**File: `src/pages/Sermons.tsx`** (line ~99, the price display)

Change:
```
${sermon.price?.toFixed(2)}
```
To:
```
${Number(sermon.price)?.toFixed(2)}
```

This wraps `sermon.price` in `Number()` to convert the string to a number before calling `.toFixed(2)`. This is a one-line fix that will immediately restore the sermons page.

