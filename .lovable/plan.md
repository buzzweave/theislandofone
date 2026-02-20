

# Phase 3: VPS Deployment via HTTPS Deploy Agent (Final)

## Summary

Add deployment capability to the AI Developer module with Staging and Live environments. Release bundles are sent over HTTPS to a VPS Deploy Agent. All addendum fixes and clarifications are integrated:

1. Staging gate checks both plan_id AND version_tag for production deploys
2. deploy_push uses service-role client for all ai_dev_deployments status transitions
3. deploy_preview inserts with status running, then updates to success/failed based on agent response
4. sanitizePayload uses precise key list: authorization, Authorization, token, agent_token, api_key, apikey, secret, password
5. preserve_paths parsed by splitting on both newlines and commas, trimming, dropping blanks
6. ai_dev_deployments.kind column (preview | push) with Deploy History filter
7. All agent fetch calls use 25s timeout; on timeout/network error set deployment status to failed with sanitized error payload
8. deploy_rollback: on agent success insert status=rolled_back; on timeout/network error insert status=failed with sanitized error payload

---

## Database Migration

### New table: `ai_dev_deployments`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| plan_id | uuid | not null | |
| environment | text | not null | 'staging' or 'production' |
| version_tag | text | not null | From ai_dev_backups apply snapshot |
| status | text | not null | queued, running, success, failed, rolled_back |
| kind | text | not null, default 'push' | 'preview' or 'push' |
| request_payload | jsonb | '{}' | Bundle sent to agent (never contains secrets) |
| response_payload | jsonb | '{}' | Agent response (sanitized before storage) |
| created_at | timestamptz | now() | |

RLS: admin-only SELECT, INSERT, DELETE. No UPDATE from client -- edge function uses service-role client.

Deploy settings stored in existing `ai_dev_settings` table using keys:
- staging_agent_url, staging_agent_token, staging_base_url
- production_agent_url, production_agent_token, production_base_url
- preserve_paths (multi-line or comma-separated, default: .env, .env.*, uploads, storage, secrets)
- require_staging_before_live (default: true)
- block_deploy_when_allowed_folders_empty (default: true)

---

## Edge Function: New Helpers (`ai-dev-operator/index.ts`)

### sanitizePayload

```text
function sanitizePayload(obj: any): any
  - JSON parse/stringify deep clone
  - Recursively walk all keys
  - Delete any key matching exactly (case-insensitive):
    authorization, token, agent_token, api_key, apikey, secret, password
  - Return cleaned object
```

### parsePreservePaths

```text
function parsePreservePaths(raw: string): string[]
  return raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
```

No other files affected in this item (edge function only).

### fetchWithTimeout

```text
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 25000): Promise<Response>
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try { return await fetch(url, { ...options, signal: controller.signal }) }
  finally { clearTimeout(timer) }
```

---

## Edge Function: New Actions

### deploy_test

- Inputs: environment
- Read {env}_agent_url and {env}_agent_token from ai_dev_settings
- If either is empty, throw error
- Call POST {agent_url}/deploy/test via fetchWithTimeout with Bearer token
- On timeout/network error: return error response (no deployment record)
- Log deploy_connection_tested to ai_dev_audit
- Return sanitized agent response

### deploy_preview

- Inputs: plan_id, environment
- Verify plan status is applied
- Load latest ai_dev_backups row where type = 'apply'
- If block_deploy_when_allowed_folders_empty is true and allowed_folders empty, refuse
- Validate paths with existing validatePaths
- Read preserve_paths from settings using parsePreservePaths
- Build bundle: { plan_id, version_tag, preserve_paths, changes }
- Insert ai_dev_deployments with status running and kind='preview' using serviceClient
- Call POST {agent_url}/deploy/preview via fetchWithTimeout
- On success: update status to success, store sanitized response_payload
- On timeout/network error: update status to failed, store sanitized error payload
- Log deploy_preview_generated to ai_dev_audit
- Return preview data

### deploy_push

- Inputs: plan_id, environment, confirm (boolean)
- If confirm !== true, throw error
- If environment is production and require_staging_before_live is true:
  - Load the apply snapshot to get the version_tag
  - Query ai_dev_deployments for a record matching same plan_id AND same version_tag with environment = 'staging' and status = 'success'
  - If none found, throw "Staging deployment with matching version_tag required before production"
- Verify plan status is applied
- Load apply snapshot, validate paths, build bundle using parsePreservePaths
- Insert ai_dev_deployments with status running and kind='push' using serviceClient
- Call POST {agent_url}/deploy/push via fetchWithTimeout
- On success: update status to success, store sanitized response_payload
- On timeout/network error: update status to failed, store sanitized error payload
- Log staging_deployed or production_deployed to ai_dev_audit

### deploy_rollback

- Inputs: environment, version_tag, target_version_tag (optional)
- Read agent URL and token for environment
- Call POST {agent_url}/deploy/rollback via fetchWithTimeout with { version_tag, target_version_tag }
- On agent success: insert ai_dev_deployments with status rolled_back
- On timeout/network error: insert ai_dev_deployments with status failed and sanitized error payload in response_payload
- Log deploy_rolled_back to ai_dev_audit

### list_deployments

- Inputs: environment (optional), kind (optional), limit (default 50)
- Query ai_dev_deployments ordered by created_at desc
- Filter by environment if provided
- Filter by kind if provided

---

## Hook Updates (`useAIDev.ts`)

Add 5 new methods:
- testDeployAgent(environment: string)
- previewDeploy(plan_id: string, environment: string)
- pushDeploy(plan_id: string, environment: string, confirm: boolean)
- rollbackDeploy(environment: string, version_tag: string, target_version_tag?: string)
- listDeployments(environment?: string, kind?: string)

---

## Admin Sidebar Updates (`AdminLayout.tsx`)

Add 3 new items to aiDevNavItems array:
- Staging Deploy -> /admin/ai-developer/deploy/staging (Upload icon)
- Live Deploy -> /admin/ai-developer/deploy/live (Globe icon)
- Deploy History -> /admin/ai-developer/deploy/history (History icon)

Import Upload, Globe, History from lucide-react.

---

## New UI Pages

### AIDevDeployStaging.tsx

Route: /admin/ai-developer/deploy/staging

- Dropdown to select an applied plan
- Generate Preview button -> shows file counts, affected paths, preserved paths
- Push to Staging button with confirmation modal
- Latest staging deployment status display
- Rollback button for last successful staging deploy

### AIDevDeployLive.tsx

Route: /admin/ai-developer/deploy/live

- Same structure as staging
- Large "Push to Website" button
- Extra confirmation modal with warning text
- Enforces require_staging_before_live: disables push and shows message until a successful staging deployment exists for the same plan_id AND version_tag

### AIDevDeployHistory.tsx

Route: /admin/ai-developer/deploy/history

- Filterable table: environment, status, kind (default: push, hiding previews)
- Columns: environment, version_tag, status badge, kind, plan_id (truncated), created_at
- Row expansion shows request_payload and response_payload (already sanitized)
- Quick rollback action on most recent successful production deploy

---

## Settings Page Updates (`AIDevSettings.tsx`)

Add a "Deployment" Card below existing Configuration card:

**Staging Environment**
- staging_agent_url (input)
- staging_agent_token (password input)
- staging_base_url (optional input)
- Test Connection button

**Live Environment**
- production_agent_url (input)
- production_agent_token (password input)
- production_base_url (optional input)
- Test Connection button

**Shared Deploy Settings**
- preserve_paths (textarea, default hint: .env, .env.*, uploads, storage, secrets)
- require_staging_before_live (switch, default on)
- block_deploy_when_allowed_folders_empty (switch, default on)

---

## Dashboard Updates (`AIDevDashboard.tsx`)

Add a "Deployments" row with 4 cards:

1. Staging Status (green/red dot based on staging_agent_url configured)
2. Live Status (same for production)
3. Last Staging Deploy (version_tag + status)
4. Last Live Deploy (version_tag + status, labeled "Current Live Version")

---

## Route Additions (`App.tsx`)

Add after the existing ai-developer routes:

```text
<Route path="ai-developer/deploy/staging" element={<AIDevDeployStaging />} />
<Route path="ai-developer/deploy/live" element={<AIDevDeployLive />} />
<Route path="ai-developer/deploy/history" element={<AIDevDeployHistory />} />
```

---

## Safety Rules

1. Refuse deploy if allowed_folders empty and block toggle is on
2. Refuse deploy if validatePaths fails
3. Refuse production deploy without confirm === true
4. Refuse production deploy if require_staging_before_live is on and no successful staging with same plan_id AND version_tag
5. Never include agent tokens in bundle payload or stored payloads
6. sanitizePayload uses precise key list: authorization, Authorization, token, agent_token, api_key, apikey, secret, password
7. deploy_preview: insert running, update to success/failed after agent response or timeout
8. deploy_push: insert running, update to success/failed after agent response or timeout
9. deploy_rollback: insert rolled_back on success, insert failed with sanitized error on timeout/network error
10. All ai_dev_deployments inserts/updates use service-role client
11. Never mutate ai_dev_plans.plan
12. All actions logged to ai_dev_audit
13. All agent fetches use 25s timeout via fetchWithTimeout

---

## Files Summary

### New files

| File | Purpose |
|------|---------|
| src/pages/admin/ai-developer/AIDevDeployStaging.tsx | Staging deploy page |
| src/pages/admin/ai-developer/AIDevDeployLive.tsx | Live deploy page |
| src/pages/admin/ai-developer/AIDevDeployHistory.tsx | Deploy history table with kind filter |

### Modified files

| File | Change |
|------|--------|
| supabase/functions/ai-dev-operator/index.ts | sanitizePayload, parsePreservePaths, fetchWithTimeout helpers; 5 new actions with timeout handling and kind field |
| src/hooks/useAIDev.ts | 5 new methods including kind parameter on listDeployments |
| src/components/admin/AdminLayout.tsx | 3 new sidebar items |
| src/pages/admin/ai-developer/AIDevSettings.tsx | Deployment configuration section |
| src/pages/admin/ai-developer/AIDevDashboard.tsx | Deployment status cards |
| src/App.tsx | 3 new routes |

### Unchanged

All files outside the AI Developer namespace.

---

## Implementation Order

1. Database migration (ai_dev_deployments table with kind column and RLS)
2. Edge function (3 helpers + 5 new actions with timeout/error handling)
3. Deploy edge function
4. Hook updates (5 new methods)
5. Settings page (deployment config section)
6. Staging Deploy page
7. Live Deploy page
8. Deploy History page
9. Dashboard updates (deployment status cards)
10. Admin sidebar (3 new nav items)
11. Route additions

