

# Phase 1: AI Developer Module (Plan-Only)

## Summary

Add a self-contained AI Developer module to the admin panel. This phase is plan-only -- the AI Console generates and stores structured plans but does not apply any changes. No existing admin pages, routes, tables, or components are modified except adding sidebar links and routes.

---

## New Database Tables

All prefixed with `ai_dev_` to avoid conflicts.

### `ai_dev_plans`

Stores every AI-generated plan with its prompt, mode, status, and result.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| prompt | text | -- | User's natural language input |
| mode | text | 'fix_bugs' | fix_bugs, build_feature, refactor, content_publish |
| plan | jsonb | null | Structured plan JSON (summary, proposedChanges, filesToChange, filesToCreate, navChanges, dbChanges, risks, rollbackSteps, requiresApproval) |
| status | text | 'draft' | draft, approved, rejected, applied, failed |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

RLS: Admin-only for all operations.

### `ai_dev_scans`

Stores site scan results.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| scan_type | text | 'full' | full, quick |
| results | jsonb | '{}' | Scan findings |
| status | text | 'completed' | running, completed, failed |
| created_at | timestamptz | now() | |

RLS: Admin-only for all operations.

### `ai_dev_audit`

Immutable log of all AI Developer actions.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| plan_id | uuid | null | FK to ai_dev_plans (nullable) |
| action | text | -- | plan_generated, plan_approved, plan_rejected, scan_run, settings_updated |
| details | jsonb | '{}' | Context data |
| created_at | timestamptz | now() | |

RLS: Admin-only SELECT and INSERT. No UPDATE or DELETE (immutable).

### `ai_dev_settings`

Key-value settings for the AI Developer module.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| key | text | -- | PK (e.g., ai_model, allowed_folders, forbidden_folders) |
| value | text | '' | Setting value |
| updated_at | timestamptz | now() | |

RLS: Admin-only for all operations.

---

## Backend: Edge Function `ai-dev-operator`

Single edge function handling all operations via an `action` field in the request body:

**Actions:**

1. **generate_plan** -- Takes `prompt` and `mode`, calls Lovable AI (google/gemini-3-flash-preview) with tool calling to produce the structured plan JSON format, inserts into `ai_dev_plans`, logs to `ai_dev_audit`, returns the plan.

2. **run_scan** -- Returns placeholder scan data (Phase 1), inserts into `ai_dev_scans`, logs to `ai_dev_audit`.

3. **list_plans** -- Queries `ai_dev_plans` ordered by created_at desc.

4. **approve_plan** -- Updates plan status to 'approved', logs to audit.

5. **reject_plan** -- Updates plan status to 'rejected', logs to audit.

6. **get_audit** -- Queries `ai_dev_audit` with optional search filter.

7. **get_settings** / **update_settings** -- Read/write `ai_dev_settings`.

Security: Uses service role key internally. Validates admin JWT from request Authorization header by checking `user_roles` table. Rate limit not needed in Phase 1 (admin-only).

AI prompt design: The edge function sends the user's prompt to Lovable AI with a system prompt instructing it to return a structured plan via tool calling, using the exact plan JSON schema (summary, proposedChanges, filesToChange, filesToCreate, navChanges, dbChanges, risks, rollbackSteps, requiresApproval).

---

## New Files

| File | Purpose |
|------|---------|
| `src/pages/admin/ai-developer/AIDevDashboard.tsx` | Status cards (total plans, approved, scans run), recent activity |
| `src/pages/admin/ai-developer/AIDevConsole.tsx` | Textarea prompt, mode dropdown, Generate Plan button, read-only JSON output |
| `src/pages/admin/ai-developer/AIDevSiteScan.tsx` | Run Scan button, results list |
| `src/pages/admin/ai-developer/AIDevPlans.tsx` | Plans list with status badges, click to view details with approve/reject buttons |
| `src/pages/admin/ai-developer/AIDevSettings.tsx` | Model name, allowed/forbidden folders fields |
| `src/pages/admin/ai-developer/AIDevAuditLog.tsx` | Searchable table of all actions |
| `src/hooks/useAIDev.ts` | React hook wrapping all edge function calls |
| `supabase/functions/ai-dev-operator/index.ts` | Backend edge function |

## Modified Files

| File | Change |
|------|--------|
| `src/components/admin/AdminLayout.tsx` | Add "AI Developer" nav group with 6 items after existing nav items, using a Bot or Cpu icon |
| `src/App.tsx` | Add 6 nested routes under `/admin/ai-developer/*` inside the existing admin Route group |

---

## Sidebar Addition

A new group labeled "AI Developer" added to the existing `navItems` array in AdminLayout.tsx with a separator/divider before it:

- Dashboard (`/admin/ai-developer`) -- LayoutDashboard icon
- AI Console (`/admin/ai-developer/console`) -- MessageSquare icon
- Site Scan (`/admin/ai-developer/scan`) -- Search icon
- Plans (`/admin/ai-developer/plans`) -- ClipboardList icon
- Settings (`/admin/ai-developer/settings`) -- Settings icon
- Audit Log (`/admin/ai-developer/audit`) -- ScrollText icon

---

## Route Structure

All routes are nested under the existing `<Route path="/admin">` group:

```
/admin/ai-developer          -> AIDevDashboard
/admin/ai-developer/console  -> AIDevConsole
/admin/ai-developer/scan     -> AIDevSiteScan
/admin/ai-developer/plans    -> AIDevPlans
/admin/ai-developer/settings -> AIDevSettings
/admin/ai-developer/audit    -> AIDevAuditLog
```

---

## AI Console UI Details

- Large textarea with placeholder: "Describe what you want to fix, build, or improve..."
- Dropdown select for mode: "Fix bugs", "Build feature", "Refactor", "Content publish"
- "Generate Plan" primary button
- Loading state while AI processes
- Read-only code block showing the returned plan JSON, formatted with syntax highlighting
- Below the plan output: "Approve" and "Reject" buttons that update the plan status

---

## Plan JSON Format

```json
{
  "summary": "string",
  "proposedChanges": "string",
  "filesToChange": ["string"],
  "filesToCreate": ["string"],
  "navChanges": ["string"],
  "dbChanges": ["string"],
  "risks": "string",
  "rollbackSteps": "string",
  "requiresApproval": true
}
```

---

## Implementation Order

1. Database migration -- 4 new tables with RLS policies
2. Edge function -- `ai-dev-operator` with all actions
3. React hook -- `useAIDev.ts`
4. AI Console page (core feature)
5. Plans page
6. Site Scan page
7. Dashboard page
8. Settings page
9. Audit Log page
10. Route and sidebar integration in App.tsx and AdminLayout.tsx

---

## What Is NOT Touched

- No existing admin pages modified (Dashboard, Books, Sermons, etc.)
- No existing database tables modified
- No existing edge functions modified
- No VPS/SSH deployment
- No automatic code application -- plans are generated and stored only
- No existing routes changed

