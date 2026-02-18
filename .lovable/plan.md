
# Fix Blog Content Formatting for Any Pasted Input

## Problem
When content is pasted into the blog editor (from Word, Notes, web, etc.), it publishes as one giant unreadable block instead of well-formed paragraphs. The text formatting utility merges all `<p>` tags into a single paragraph and only splits by sentences as a last resort.

## Root Cause
The `extractParagraphs` function in `src/lib/textFormat.ts` has flawed merging logic:
- In the HTML path, it joins ALL consecutive non-empty `<p>` elements into one block, only breaking on empty `<p>` tags
- The sentence-grouping fallback (3 sentences per paragraph) only activates for plain text over 500 characters with zero line breaks
- This means pasted content (which TipTap wraps in `<p>` tags) gets collapsed into a wall of text

## Solution
Rewrite the paragraph extraction logic to intelligently group content into readable paragraphs regardless of how it was pasted:

### Changes to `src/lib/textFormat.ts`

1. **HTML path**: Instead of merging all `<p>` tags into one block, collect each `<p>` as its own text unit. Then apply smart grouping -- if most paragraphs are just single sentences (a sign of line-by-line paste), merge them into proper paragraphs of 3-5 sentences each.

2. **Sentence grouping logic**: When a block of text is one continuous run (no paragraph breaks), split it into paragraphs of approximately 4-5 sentences for comfortable reading. This matches the "Preacher's Wife" post formatting.

3. **Detection heuristic**: If the average paragraph length is under ~80 characters (indicating single-sentence lines), apply automatic sentence grouping. If paragraphs are already substantial (author intended those breaks), preserve them.

### Technical Details

```text
BEFORE (current logic):
  HTML input -> collect <p> tags -> merge ALL into one string (split only on empty <p>) -> return

AFTER (new logic):
  HTML input -> collect <p> tags as individual text units
    -> if most are short (single sentences): group every 4-5 sentences into paragraphs
    -> if already substantial paragraphs: keep them as-is
    -> apply fixPunctuation to each result
  
  Plain text input -> split by double newlines
    -> if only 1 block and it's long: split by sentences, group 4-5 per paragraph
    -> apply fixPunctuation to each result
```

### Files Modified
- `src/lib/textFormat.ts` -- rewrite `extractParagraphs` with smart paragraph grouping

No other files need changes. The `BlogPost.tsx` and `ReaderChapterContent.tsx` already import from this shared utility, so they will automatically benefit from the improved logic.
