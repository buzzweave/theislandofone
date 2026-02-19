

# Fix: Sermon and Book Creation — MySQL Syntax Error

## Root Cause
The VPS uses **MySQL**, not PostgreSQL. The error `"near '' at line 1"` means the VPS backend is failing to build a valid SQL INSERT when it receives:
- `access_tiers: []` — MySQL has no array type; the VPS likely converts this to a comma-separated string, and an empty array becomes `''` which breaks the query
- `chapters: []` — same problem, or the VPS doesn't expect this field on create
- `audio_url: null` — may cause `NULL` handling issues in the VPS query builder

## Changes (2 files)

### 1. `src/pages/admin/AdminSermonEditor.tsx`
In the `addNew` function (~line 93):
- Change `access_tiers: []` to `access_tiers: ""` (empty string, which MySQL can handle)
- Change `audio_url: null` to `audio_url: ""` (empty string instead of null)

In `handleSave` (~line 137):
- Ensure `access_tiers` is sent as a comma-separated string if it's an array: `access_tiers: Array.isArray(draft.access_tiers) ? draft.access_tiers.join(",") : draft.access_tiers`
- Ensure `audio_url` sends `""` instead of `null`

### 2. `src/pages/admin/AdminBookEditor.tsx`
In the `addNew` function (~line 124):
- Change `access_tiers: []` to `access_tiers: ""`
- Change `audio_url: null` to `audio_url: ""`
- Remove `chapters: []` from the create payload (VPS creates the book first, chapters are added separately via update)

In `handleSave` (~line 186):
- Ensure `access_tiers` is sent as comma-separated string if array
- Ensure `audio_url` sends `""` instead of `null`

## What This Fixes
- "Error creating book" with MySQL syntax error
- "Failed to create sermon" with MySQL syntax error
- Both create flows will send MySQL-compatible values to the VPS

