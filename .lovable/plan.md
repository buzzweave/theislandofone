

# Performance and Reliability Improvements

## Problem Analysis

Your database has very small amounts of data (1 book with 3 chapters totaling ~7KB), so the timeouts are NOT caused by large data. The issues are likely caused by:

1. Unnecessary re-fetching of data on every page navigation
2. No retry logic when a request fails
3. The preview environment has inherent latency compared to a production deployment
4. Multiple simultaneous database calls on page load (homepage loads books + chapters + sermons + videos all at once)

## What Will Change

### 1. Add Aggressive Caching to All Data Hooks
Currently data goes stale quickly and refetches often. We will increase cache times so data loads once and stays available:
- Books, sermons, videos, hero banners, settings: cache for 5 minutes instead of 30 seconds
- Prevent background refetching when the browser tab regains focus

### 2. Add Retry Logic to All Queries
When a request fails (network hiccup, cold start), automatically retry up to 3 times with increasing delays instead of showing an error immediately.

### 3. Save with Retry and Smaller Chunks
- Reduce chapter upsert chunk size from 5 to 2 for faster individual requests
- Add retry logic (3 attempts) on failed save chunks
- Add a small delay between chunks to avoid overwhelming the connection

### 4. Optimize Homepage Loading
- Load books, sermons, and videos in parallel (already done) but add error boundaries so one failing request doesn't block the whole page

### 5. Add Global Query Client Configuration
Set sensible defaults for all queries in one place: retry count, stale time, and refetch behavior.

## Technical Details

**Files to modify:**
- `src/main.tsx` - Configure global QueryClient with retry and caching defaults
- `src/hooks/useBooks.ts` - Add staleTime, reduce chunk size to 2, add retry logic to upserts
- `src/hooks/useSermons.ts` - Add staleTime
- `src/hooks/useVideos.ts` - Add staleTime
- `src/hooks/useHeroBanners.ts` - Add staleTime
- `src/hooks/useSiteSettings.ts` - Add staleTime
- `src/hooks/useBlogPosts.ts` - Add staleTime
- `src/hooks/useGraphics.ts` - Add staleTime
- `src/hooks/useMembershipPlans.ts` - Add staleTime
- `src/pages/admin/AdminBookEditor.tsx` - Add retry wrapper around handleSave with exponential backoff

**Key configuration (QueryClient defaults):**
```text
retry: 3
retryDelay: attempt => Math.min(1000 * 2^attempt, 10000)
staleTime: 5 minutes
refetchOnWindowFocus: false
```

**Chapter upsert retry logic:**
```text
For each chunk of 2 chapters:
  Attempt 1 -> if fail, wait 1s
  Attempt 2 -> if fail, wait 2s
  Attempt 3 -> if fail, throw error
```

## What This Won't Fix

- The Lovable preview environment has some inherent latency. For the best performance, deploy to your VPS or use the published URL (theislandofone.lovable.app).
- Initial cold-start connections to the database take 1-2 seconds -- this is normal and cannot be eliminated.

