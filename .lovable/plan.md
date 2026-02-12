

## Fix: Add API Key Input Fields and Route All AI Through ChatGPT API

### Problem
The VPS is serving an older version of `AdminSettings.tsx` that shows integration status badges only (no input fields). The Lovable source code already contains the correct implementation with API key inputs, but the VPS build is stale.

### What Will Change

**1. Re-save AdminSettings.tsx** (force fresh build in Lovable preview so you can verify, then copy to VPS)

The Integrations card will display:
- **ChatGPT / OpenAI** row with a password input field (placeholder: `sk-...`) and a "Configured" / "Not configured" indicator
- **ElevenLabs** row with a password input field (placeholder: `xi-...`) and a "Configured" / "Not configured" indicator
- Both keys are saved when you click **Save Settings**

**2. No code changes needed** -- the file already contains the correct implementation. The issue is purely a deployment/cache problem on your VPS.

### Steps After Approval

1. I will re-save `AdminSettings.tsx` with a small formatting touch to trigger a fresh Lovable build.
2. You verify in the Lovable preview that the input fields appear at `/admin/settings`.
3. Copy the file contents to your VPS, run `npm run build`, and hard-refresh the browser.

### VPS Deployment Checklist
- Replace `src/pages/admin/AdminSettings.tsx` on your VPS with the updated file
- Run `npm run build` (or `vite build`) to regenerate the production bundle
- Restart your web server if it caches static assets
- Hard-refresh the browser (Ctrl+Shift+R)

### Note on "All AI Controlled by ChatGPT API"
The AI writing feature (`AISidebar.tsx`) already calls your VPS endpoint at `/api/ai-writing`. Your VPS backend should read the `chatgpt_api_key` from the `site_settings` table and use it when calling the OpenAI API. No frontend changes are needed for this -- it is a VPS backend configuration concern.

