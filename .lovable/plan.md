

# Update Inner Circle Features, Button Text, and Add Membership Access Toggles

## 1. Update Inner Circle Features (Database)

Update the `membership_plans` table to set the new feature list for the Inner Circle plan:

1. Everything in Pastor
2. Monthly Leadership Series
3. Downloadable leadership notes (GoodNotes + PDF)
4. Visual leadership frameworks & teaching graphics
5. Slide-ready visuals for teaching or preaching
6. Early access to new leadership content
7. Built for pastors, leaders, and builders

## 2. Change "Get Started" to "Join Now" (Membership Page)

In `src/pages/Membership.tsx`, line 113, replace `"Get Started"` with `"Join Now"`.

## 3. Add `access_tiers` Column (Database Migration)

Add a `text[] DEFAULT '{}'` column called `access_tiers` to three tables:
- `sermons`
- `books`
- `graphics`

Empty array means no tier restriction (falls back to existing free/paid logic). When populated with tier slugs like `["reader", "pastor", "inner-circle"]`, only users with those tiers (or higher) get access.

## 4. Add Membership Access Toggles in Admin

### Sermon Editor (`AdminSermonEditor.tsx`)
Add a "Membership Access" section inside the Publishing Controls card (after the Preview Cutoff slider, around line 362). Three checkboxes: Reader, Pastor, Inner Circle. Saves selected slugs to the `access_tiers` column.

Update `handleSave` to include `access_tiers` in the save payload. Update `useSermons.ts` Sermon interface to include `access_tiers: string[]`.

### Book Editor (`AdminBookEditor.tsx`)
Add the same "Membership Access" section inside the Publishing Controls card (after the price section, around line 531). Same three checkboxes.

Update `handleSave` to include `access_tiers`. Update `useBooks.ts` Book interface to include `access_tiers: string[]`.

### Graphics Admin (`AdminGraphics.tsx`)
Add a row of three small toggle buttons (Reader / Pastor / Inner Circle) below the Description field for each graphic item. Updates are saved via `updateGraphic()` which calls the admin edge function.

Update `useGraphics.ts` Graphic interface to include `access_tiers: string[]`.

## 5. Update Frontend Access Logic

Update `SermonDetail.tsx`, `BookDetail.tsx`, and `Graphics.tsx` to check the user's subscription tier against the item's `access_tiers` array. Tier hierarchy: inner-circle > pastor > reader. If the user's tier is in the array (or is higher than a listed tier), they get access.

## Files Modified

| File | Change |
|------|--------|
| Database | Update Inner Circle features, add `access_tiers` column to 3 tables |
| `src/pages/Membership.tsx` | "Get Started" -> "Join Now" |
| `src/hooks/useSermons.ts` | Add `access_tiers` to Sermon interface |
| `src/hooks/useBooks.ts` | Add `access_tiers` to Book interface |
| `src/hooks/useGraphics.ts` | Add `access_tiers` to Graphic interface |
| `src/pages/admin/AdminSermonEditor.tsx` | Add membership access checkboxes |
| `src/pages/admin/AdminBookEditor.tsx` | Add membership access checkboxes |
| `src/pages/admin/AdminGraphics.tsx` | Add membership access toggles |
| `src/pages/SermonDetail.tsx` | Check `access_tiers` for unlock logic |
| `src/pages/BookDetail.tsx` | Check `access_tiers` for unlock logic |
| `src/pages/Graphics.tsx` | Check `access_tiers` for unlock logic |

