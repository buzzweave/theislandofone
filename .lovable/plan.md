

# Lock All Paid Books and Sermons Behind Purchase

## Current Behavior

- **Books**: `canRead = true` is hardcoded, so ALL chapters are fully readable for every book, even paid ones. The inline reader locks chapters after the first for paid books, but the accordion chapter list below shows everything expanded.
- **Sermons**: Already has a working paywall with preview cutoff and a "Buy" button, but uses a mock/demo purchase flow (`handleMockPurchase` sets state in memory only -- resets on refresh).

## What Changes

### Books (`src/pages/BookDetail.tsx`)
- Remove the hardcoded `canRead = true`
- Replace with `const canRead = book.is_free || purchased` (same pattern sermons use)
- Add `purchased` state and a checkout sidebar (matching the sermon page design)
- The accordion chapter list will show only the first chapter expanded for paid books; remaining chapters show a lock icon
- Download buttons (PDF, EPUB, Word) only appear when the book is free or purchased
- For paid books, show a "Get This Book" card in the sidebar with price and purchase button

### Sermons (`src/pages/SermonDetail.tsx`)
- Already correctly implemented with preview cutoff and paywall
- No structural changes needed; the existing mock purchase flow stays in place

### Inline Book Reader (`src/components/reader/InlineBookReader.tsx`)
- Already correctly locks chapters after the first for paid books
- No changes needed

### Books listing page (`src/pages/Books.tsx`)
- Add a lock icon badge on paid book cards (similar to sermon list) so users can see at a glance which are free vs paid

### Sermons listing page (`src/pages/Sermons.tsx`)
- Already shows free/paid badges correctly
- No changes needed

## Technical Details

### `src/pages/BookDetail.tsx`
- Add `useState` for `purchased` and `showCheckout` (same as SermonDetail)
- Change `canRead` from `true` to `book.is_free || purchased`
- Wrap download buttons in a condition: only show when `canRead` is true
- For paid + not purchased: show "Contact to Purchase" or a checkout card in a sidebar layout
- The existing accordion chapters section already respects `canRead` and `isPreview` -- once `canRead` is false, locked chapters will show the lock icon and won't expand

### `src/pages/Books.tsx`
- Add Lock icon import
- Show a small price/lock badge on each paid book card (below the "Free" label logic)

