

## Fix: API Key Input Fields Not Showing in Integrations Card

The file `src/pages/admin/AdminSettings.tsx` already contains the correct code with API key input fields for ChatGPT and ElevenLabs. Based on your screenshot, the page is rendering an older version that only shows status indicators without input fields.

### Root Cause

The browser or your server is serving a cached/stale build. The current source code is correct and includes:
- ChatGPT API Key input (password field, placeholder `sk-...`)
- ElevenLabs API Key input (password field, placeholder `xi-...`)
- "Configured" / "Not configured" status indicators
- Both saved via the "Save Settings" button

### What Needs to Happen

1. **Rebuild the project** on your VPS by running `npm run build` (or `vite build`) to generate a fresh production bundle that includes the updated Integrations card with input fields.

2. **Clear the browser cache** or do a hard refresh (Ctrl+Shift+R / Cmd+Shift+R) to load the new build.

3. No code changes are needed -- the file is already correct. I will re-save the file to force a fresh build in Lovable's preview so you can verify it works here first.

### Technical Detail

The Integrations card currently renders (lines 196-274):
- Cloud Storage row (status only)
- ChatGPT / OpenAI row with a password `Input` field for the API key
- ElevenLabs row with a password `Input` field for the API key
- Both fields are saved in `handleSave` via `chatgptApiKey.updateValue()` and `elevenlabsApiKey.updateValue()`

