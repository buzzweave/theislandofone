

# Remove All Timeouts from Book Editor

## What Changes

Remove the 60-second `SAVE_TIMEOUT` and `Promise.race` wrapper from `handleSave` in the admin book editor. The save will simply await the database calls with no artificial time limit -- it finishes when it finishes, or fails only if the server returns an actual error.

## Files to Modify

**`src/pages/admin/AdminBookEditor.tsx`** (lines 185-227)

Replace `handleSave` to remove:
- The `SAVE_TIMEOUT` constant
- The `timer` variable
- The `timeoutPromise` Promise
- The `Promise.race` wrapper
- The `"timed out"` error branch in the catch block
- The `clearTimeout` in the finally block

The new `handleSave` will be:

```text
const handleSave = async (isAuto = false) => {
  if (!local || saving || savingRef.current) return;
  setSaving(true);
  savingRef.current = true;

  try {
    const { chapters, ...bookData } = local;
    await updateBookMut.mutateAsync({ id: local.id, ...bookData });
    await upsertChaptersMut.mutateAsync({ bookId: local.id, chapters });

    setDirty(false);
    setLastSavedAt(new Date());
    if (!isAuto) {
      toast({ title: "Book & chapters saved successfully!" });
    }
  } catch (err: any) {
    console.error("Save error:", err);
    const msg = err.message || "Unknown error";
    if (msg.includes("session") || msg.includes("log in") || msg.includes("RLS")) {
      toast({ title: "Session expired", description: "Please log out and log back in, then try saving again.", variant: "destructive" });
    } else {
      toast({ title: isAuto ? "Auto-save failed" : "Save failed", description: msg, variant: "destructive" });
    }
  } finally {
    setSaving(false);
    savingRef.current = false;
  }
};
```

No other files need changes. The retry logic in `useBooks.ts` and global query retry settings in `App.tsx` remain intact -- those handle transient failures, not artificial timeouts.

