

# Upgrade Members Area -- Real Data, Add/Delete Members, Email Action

## Overview
Replace the mock-data members page with a real database-backed system. You will be able to add members (assigning them to any membership tier, including free), delete members, and click the email icon to open your email client.

## What Changes

### 1. Create a `members` database table
A new table to store manually-added members with their name, email, assigned plan, and status.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| name | text | Member's name |
| email | text | Member's email |
| plan | text | Tier name (Reader, Pastor, Inner Circle, or Free) |
| status | text | active, paused, or cancelled |
| created_at | timestamp | When added |

RLS policies: Admin-only for all operations (SELECT, INSERT, UPDATE, DELETE) using the existing `has_role` function.

### 2. Fix the email button
The mail icon button currently does nothing. It will be changed to open your default email app with the member's email pre-filled (`mailto:` link).

### 3. Add "Add Member" button and dialog
- An "Add Member" button at the top of the page
- Opens a dialog form with fields: Name, Email, Plan (dropdown including "Free" option), Status
- Saves the new member to the database

### 4. Add "Delete" button per member row
- A trash icon button next to the email button in each row
- Shows a confirmation dialog before deleting
- Removes the member from the database

### 5. Load members from database
- Replace the hardcoded mock data with a real database query
- Plan summary cards will reflect actual member counts

## Technical Details

| File | Change |
|------|--------|
| Database migration | Create `members` table with admin-only RLS policies |
| `src/pages/admin/AdminMembers.tsx` | Full rewrite: fetch from DB, add member dialog, delete confirmation, `mailto:` on email button |

