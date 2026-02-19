

# Connect Members Table to Content Access

## Overview
Right now, manually adding a member in the admin panel is just record-keeping -- it doesn't grant them any actual access. This plan bridges that gap so that when you assign a member a plan (Free, Reader, Pastor, Inner Circle), they can sign in and access the corresponding content.

## How It Will Work

1. A visitor signs up or signs in on the site (email/password, Google, or Apple)
2. You add them as a member in the admin panel using their email and assign a tier
3. When they view content, the system checks: "Does this email have a member record with a matching plan?" If yes, access is granted -- no Stripe payment needed

## Changes

### 1. Update the `check-subscription` edge function
This function already runs every time a user views content. It currently only checks Stripe. We will add a fallback: if no Stripe subscription is found, look up the user's email in the `members` table. If an active member record exists with a paid plan, return that plan's access level.

This means ALL existing content gates (books, sermons, graphics) will automatically respect admin-assigned memberships with zero frontend changes.

### 2. Add a `user_id` column to the `members` table (optional link)
Add an optional `user_id` column so that when a user signs up with the same email as a member record, the system can link them. This makes lookups faster and more reliable than email matching alone.

### 3. Create a database trigger to auto-link members
When a new user signs up (profile created), check if their email exists in the `members` table. If so, automatically set the `user_id` on that member record.

### 4. Update the admin Members page
- Show a status indicator: "Linked" (has signed up) vs "Invited" (hasn't signed up yet)
- The admin can still add members by email before they sign up -- once they do sign up, the link happens automatically

## What This Means for You
- **Free tier members**: Add their email, assign "Free" plan. They sign up normally and get free-tier access
- **Paid tier members**: Add their email, assign "Reader" / "Pastor" / "Inner Circle". They sign up and immediately get that tier's content without paying
- **Stripe subscribers**: Continue to work exactly as before -- Stripe is checked first, member table is the fallback

## Technical Details

| File | Change |
|------|--------|
| Database migration | Add optional `user_id` column to `members` table; add trigger to auto-link on profile creation |
| `supabase/functions/check-subscription/index.ts` | Add fallback: if no Stripe sub, query `members` table for active record matching user email/id and return equivalent access |
| `src/pages/admin/AdminMembers.tsx` | Show linked/invited badge per member row |

No changes needed to any content pages (BookDetail, SermonDetail, Graphics, etc.) since they all rely on the `check-subscription` response.
