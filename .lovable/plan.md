

# Fix Membership Plans Displaying Wrong Data

## Problem

The Membership page uses `useMembershipPlans` which calls `api.get("/api/membership-plans")` -- an external API endpoint. This external API is returning incorrect data (all plans showing as "Premium Monthly" at $29.99). Meanwhile, the database has the correct plans:

| Plan | Price | Slug |
|------|-------|------|
| Reader | $9.99 | reader |
| Pastor | $19.99 | pastor |
| Inner Circle | $39.99 | inner-circle |

## Solution

Update `useMembershipPlans` to query the database directly instead of the external API. This ensures the Membership page always reflects the data you manage in the admin dashboard.

## Changes

### 1. Update `src/hooks/useMembershipPlans.ts`

Replace the external API call with a direct database query using the existing database client. The hook will:
- Query the `membership_plans` table directly
- Order results by `sort_order`
- Parse the `features` column (stored as JSON array)

### 2. No other files need to change

The `Membership.tsx` page and `AdminMembershipPlans.tsx` admin page both consume the same hook, so fixing the data source fixes both views. The `MembershipPlan` interface already matches the database columns.

## Technical Details

The current hook:
```text
queryFn: () => api.get("/api/membership-plans")
```

Will become:
```text
queryFn: async () => {
  const { data, error } = await supabase
    .from("membership_plans")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data;
}
```

Similarly, the `AdminMembershipPlans` page uses `api.put` to update plans -- this will also be switched to use the database client directly so edits are saved to the correct place.

