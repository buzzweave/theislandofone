
# Fix Sermon, Book, and Blog Creation via VPS API

## Problem
Creating new sermons and books fails because the VPS API expects integer values (`1`/`0`) for boolean fields, but the frontend sends JavaScript booleans (`true`/`false`). Books also need `chapters: []` in the creation payload.

## Changes (5 files)

### 1. `src/pages/admin/AdminSermonEditor.tsx`
- In `addNew` (line 93-112): Change `is_free: true` to `is_free: 1`, `featured: false` to `featured: 0`
- Add `console.error` in catch block for debugging
- In `handleSave` (line 140-142): Convert `is_free` and `featured` to `1`/`0` before sending

### 2. `src/pages/admin/AdminBookEditor.tsx`
- In `addNew` (line 124-138): Change `is_free: true` to `is_free: 1`, `featured: false` to `featured: 0`, add `chapters: []`
- In `handleSave` (line 188): Ensure `is_free` and `featured` are sent as `1`/`0`

### 3. `src/pages/admin/AdminBlogManager.tsx`
- In `handleSave` (line 148-151): Convert `is_published` to `1`/`0` before sending to VPS

### 4. `src/hooks/useSermons.ts`
- Update `Sermon` interface: `is_free` and `featured` typed as `number | boolean`

### 5. `src/hooks/useBooks.ts`
- Update `Book` interface: `is_free` and `featured` typed as `number | boolean`

## What This Fixes
- New sermon creation via the "+" button
- New book creation via the "+" button
- Blog post creation and updates
- Saving existing sermons and books with correct data format
