

# Fix: Membership Plans Not Showing in Admin

## Root Cause

The VPS endpoint `GET /api/plans` does **not exist** -- it returns `Cannot GET /api/plans`. The `useMembershipPlans` hook tries to fetch from this endpoint, fails, and falls back to an empty array. That is why plans don't render.

The original plan data lives in `src/data/content.ts` as a static `membershipPlans` export, and several other pages (Index, BookDetail, SermonDetail, AdminAnalytics) still import from there successfully.

## Fix Strategy

Rewrite `useMembershipPlans` to use the static `membershipPlans` data from `src/data/content.ts` as the source, since the VPS plans endpoint does not exist. This restores plans in both the admin editor and the public Membership page.

## Changes

### 1. `src/hooks/useMembershipPlans.ts`

- Remove the VPS API call to `/api/plans`
- Import `membershipPlans` from `src/data/content`
- Return the static data directly (mapped to the `MembershipPlan` interface with `is_featured` and `sort_order` defaults)
- Keep the `useQuery` wrapper so the rest of the app works unchanged

### 2. `src/pages/admin/AdminMembershipPlans.tsx`

- Remove the `api.put` call to `/api/plans/:id` (endpoint doesn't exist)
- Change the save logic to show a toast explaining that plan changes must be updated in the static content file or on the VPS once the endpoint is created
- Alternatively, keep the edit UI functional for preview but disable the save network call

## What Does Not Change

- No routing changes
- No other pages change (they already import from `src/data/content.ts`)
- No new dependencies

## Result

Plans will show immediately in the admin panel and on the public Membership page using the existing static data.
