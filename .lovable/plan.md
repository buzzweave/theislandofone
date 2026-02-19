

# Fix: Sermon and Book Creation — Remove Unknown Fields from Payloads

## Root Cause

The MySQL schema on the VPS does **not** have an `access_tiers` column on the `books` or `sermons` tables. When the frontend sends `access_tiers` in the POST body, the VPS query builder tries to build an INSERT with a column that doesn't exist, producing the MySQL syntax error `"near '' at line 1"`.

The `audio_url` column is defined as `TEXT NULL` in MySQL, so sending `null` should be fine, but sending an empty string is also safe.

## Changes (2 files)

### 1. `src/pages/admin/AdminSermonEditor.tsx`

**In `addNew` (~line 91-114):**
- Remove `access_tiers` from the create payload entirely (the MySQL table has no such column)
- Remove `sort_order` (also not needed for creation, MySQL defaults to 0)

**In `handleSave` (~line 130-151):**
- Remove `access_tiers` from the save payload
- Keep `audio_url` as-is (nullable TEXT column handles both null and empty string)

### 2. `src/pages/admin/AdminBookEditor.tsx`

**In `addNew` (~line 122-143):**
- Remove `access_tiers` from the create payload

**In `handleSave` (~line 182-200):**
- Remove `access_tiers` from the save payload
- Remove `chapters` from the spread (chapters are saved via a separate `PUT /api/books/:id/chapters` endpoint per the API spec)

## What This Fixes
- "Failed to create sermon" -- MySQL syntax error caused by unknown `access_tiers` column
- "Error creating book" -- same root cause
- Both creation flows will now send only columns that exist in the MySQL schema

## Technical Note
The `access_tiers` feature shown in the UI (checkboxes for Reader/Pastor/Inner Circle) will have no backend effect until the VPS MySQL schema is updated to include an `access_tiers` column. The UI controls can remain for now but will be non-functional. A future VPS schema migration would add: `ALTER TABLE sermons ADD COLUMN access_tiers TEXT DEFAULT '';` and similarly for books.

