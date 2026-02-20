

# Phase 2: Metadata-Only Apply Workflow (Final Corrected)

## Summary

Extend the AI Developer module with the complete Apply/Diff/Rollback pipeline. All operations are metadata-driven -- no project source files are read from disk. The original `ai_dev_plans.plan` JSON is never mutated after creation. Diff payloads are stored separately in `ai_dev_backups`. A new `version_tag` column on `ai_dev_backups` provides ISO timestamp identifiers for Phase 3 release tagging. Path normalization is hardened to handle backslashes, `./` prefixes, duplicate slashes, and `..` traversal attacks.

---

## Database Migration

### New table: `ai_dev_backups`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| plan_id | uuid | not null | References plan conceptually |
| type | text | 'apply' | 'diff' or 'apply' |
| version_tag | text | not null | ISO timestamp string (e.g. 2026-02-20T14:30:00.000Z) for Phase 3 release identifier |
| snapshot | jsonb | '{}' | For diff: computed diff payload + validation. For apply: plan patch metadata + validation + timestamp |
| created_at | timestamptz | now() | |

RLS policies (admin-only):
- SELECT for admins
- INSERT for admins
- DELETE for admins (future retention)
- No UPDATE

---

## Plan JSON Format (Immutable After Creation)

The `generate_plan` AI tool-calling schema is extended with a `changes` array:

```text
{
  "summary": "...",
  "proposedChanges": "...",
  "filesToChange": ["path/to/file"],
  "filesToCreate": ["path/to/new"],
  "changes": [
    {
      "path": "src/pages/Foo.tsx",
      "operation": "create" | "replace",
      "before": "string | null",
      "after": "string (required)",
      "notes": "string | null"
    }
  ],
  "navChanges": [...],
  "dbChanges": [...],
  "risks": "...",
  "rollbackSteps": "...",
  "requiresApproval": true
}
```

Once stored in `ai_dev_plans.plan`, this JSON is never mutated.

---

## Edge Function Changes (`ai-dev-operator/index.ts`)

### Path normalization helper (hardened)

```text
function normalizePath(p: string): string
  1. Trim whitespace
  2. Convert all backslashes to forward slashes
  3. Strip leading "./"
  4. Collapse duplicate slashes (e.g. "src//pages" -> "src/pages")
  5. Remove trailing slash
  6. Reject (throw error) if result contains ".."

function validatePaths(files: string[], allowed: string[], forbidden: string[]): { valid: boolean, errors: string[] }
  - Normalize all inputs (files, allowed entries, forbidden entries)
  - If allowed is empty, return error "allowedPaths is empty -- Apply blocked"
  - Each file must start with at least one normalized allowed entry
  - No file may start with any normalized forbidden entry
  - Default forbidden (if setting not configured):
    .env, .env.*, supabase/config.toml, config, secrets, auth, billing, payments
```

### Updated action: `generate_plan`

Add `changes` array to the AI tool-calling schema so the model returns per-file patch objects with `path`, `operation`, `before`, `after`, `notes`.

### New action: `generate_diff`

- Takes `plan_id`
- Reads plan from `ai_dev_plans` (never mutates it)
- Validates all paths using `validatePaths` (which uses hardened `normalizePath`)
- Computes diff from plan metadata only:
  - If `before` and `after` exist: unified diff text
  - If only `after`: change summary with operation label and new content
- Generates `version_tag` as `new Date().toISOString()`
- Stores diff payload as a new row in `ai_dev_backups` with `type = 'diff'` and `version_tag`
- Logs `diff_generated` to `ai_dev_audit`
- Returns the diff payload and version_tag

### New action: `apply_plan`

- Takes `plan_id`
- Verifies status is "approved"
- Validates paths; refuses if allowed_folders is empty
- Generates `version_tag` as `new Date().toISOString()`
- Creates record in `ai_dev_backups` with `type = 'apply'`, `version_tag`, snapshot containing: plan changes array, validation results, timestamp
- Updates plan status to "applied"
- Logs `plan_applied` to `ai_dev_audit` with filesAffected, version_tag

### New action: `rollback_plan`

- Takes `plan_id`
- Verifies status is "applied" OR "failed"
- Updates plan status to "rolled_back"
- Logs `plan_rolled_back` to `ai_dev_audit`

### New action: `get_plan_status`

- Takes `plan_id`
- Returns plan record, related `ai_dev_backups` records (both diff and apply types), and related audit entries

---

## Hook Updates (`useAIDev.ts`)

Add 4 new methods:
- `generateDiff(plan_id: string)`
- `applyPlan(plan_id: string)`
- `rollbackPlan(plan_id: string)`
- `getPlanStatus(plan_id: string)`

---

## New Page: `AIDevPlanDetail.tsx`

Route: `/admin/ai-developer/plans/:id`

1. **Header**: Plan summary, mode, date, prompt, status badge
   - Status colors: Draft (gray), Approved (blue), Applied (green), Failed (red), Rolled Back (orange)

2. **Diff Preview Panel**:
   - Reads diff data from `ai_dev_backups` records where `type = 'diff'` (not from plan JSON)
   - If no diff generated yet, shows "Generate Diff" button
   - If `before` and `after` exist: unified diff view
   - If only `after`: "New file" label with content preview
   - Shows version_tag for each diff snapshot

3. **Action Buttons**:
   - "Generate Diff" -- validates paths, creates diff snapshot in ai_dev_backups
   - "Apply Approved Plan" -- enabled only when status is "approved" and allowed_folders configured
   - "Rollback" -- enabled when status is "applied" or "failed"

4. **Confirmation Modals**:
   - Apply: shows file count, affected paths, requires confirmation
   - Rollback: simple confirmation

5. **Audit Trail**: related audit entries for this plan

---

## Updated Pages

### `AIDevPlans.tsx`
- Status badges with colors: draft (gray), approved (blue), applied (green), failed (red), rolled_back (orange)
- Each plan links to `/admin/ai-developer/plans/:id`
- Show file counts from plan changes array

### `AIDevSettings.tsx`
- Update forbidden_folders placeholder to: `.env, .env.*, supabase/config.toml, config, secrets, auth, billing, payments`
- Show warning when allowed_folders is empty: "Apply workflow is blocked until allowed folders are configured."

---

## Route Addition (`App.tsx`)

Add inside admin route group after line 127:
```text
<Route path="ai-developer/plans/:id" element={<AIDevPlanDetail />} />
```

---

## Files Summary

### New files
| File | Purpose |
|------|---------|
| `src/pages/admin/ai-developer/AIDevPlanDetail.tsx` | Plan detail with diff preview (from ai_dev_backups), apply/rollback, confirmation modals, audit trail |

### Modified files
| File | Change |
|------|--------|
| `supabase/functions/ai-dev-operator/index.ts` | Hardened normalizePath (backslashes, ./, //, .. rejection), validatePaths, generate_diff (stores to ai_dev_backups with version_tag), apply_plan (stores to ai_dev_backups with version_tag), rollback_plan (accepts applied OR failed), get_plan_status, extended generate_plan schema with changes array |
| `src/hooks/useAIDev.ts` | Add generateDiff, applyPlan, rollbackPlan, getPlanStatus |
| `src/pages/admin/ai-developer/AIDevPlans.tsx` | Status colors for all statuses, link each plan to detail page |
| `src/pages/admin/ai-developer/AIDevSettings.tsx` | Updated forbidden placeholder, empty-allowed-folders warning |
| `src/App.tsx` | Add plans/:id route |

### Unchanged
Everything outside the AI Developer namespace.

---

## Status Lifecycle

```text
Draft --> Approved --> Applied --> (success)
  |         |            |
  v         v            v
Rejected  (stays)    Failed --> Rolled Back
```

- Only Approved plans can be Applied
- Applied OR Failed plans can be Rolled Back
- Every transition logged in ai_dev_audit

---

## Implementation Order

1. Database migration (ai_dev_backups table with type and version_tag columns)
2. Edge function (hardened normalizePath + validatePaths + 4 new actions + extended generate_plan schema)
3. Deploy edge function
4. Hook updates (4 new methods)
5. Plan Detail page (reads diff from ai_dev_backups, not plan JSON)
6. Plans list updates (status colors, links)
7. Settings page (forbidden defaults, empty-allowed warning)
8. Route addition

