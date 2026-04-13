# Feature Spec: Settings UI & Provider Configuration

**Status:** Draft
**Author:** tsk + Claude
**Date:** 2026-04-13
**Epic:** Multi-Provider Support
**Priority:** P0

---

## Problem Statement

BS Detector currently has no user-facing settings interface. The API key must be set via the Chrome DevTools console (`chrome.storage.local.set({apiKey: "..."})`), which is a developer-only workflow that no normal user would tolerate. There is also no way to switch between providers or configure which model to use.

For the multi-provider vision to work, users need a simple settings page where they can:
1. Choose their preferred AI provider
2. Paste their API key with clear instructions on how to get one
3. See at a glance which providers are configured and active

This is a prerequisite for both the Gemini and Grok provider integrations — without it, users have no way to enter their keys.

## Goals

1. Users can configure their AI provider and API key through a visual settings page (no DevTools needed)
2. Clear, step-by-step instructions guide users to get a free API key for each provider
3. Switching between providers takes less than 5 seconds
4. Settings are persisted in `chrome.storage.local` and survive extension updates
5. The gear icon in the popup provides instant access to settings

## Non-Goals

- **Account system or cloud sync** — Settings are local to the browser. No server-side storage, no login required.
- **Auto-detection of existing API keys** — We won't scan the filesystem or other extensions for keys.
- **In-popup settings** — The popup is too small for a full settings form. Settings get their own page.
- **Themes or visual customization** — Focus on functional settings only. Visual preferences are a separate concern.
- **Import/export settings** — Not needed for v1. Users can re-enter keys if they switch browsers.

## User Stories

### New User (First-Time Setup)

- **As a new user who just installed BS Detector**, I want to see a clear prompt telling me I need to configure an API key so that I understand why the Analyze button doesn't work yet.
- **As a non-technical user**, I want step-by-step instructions with links to get a free API key so that I don't need to search the web for how to do it.
- **As a user who followed the setup instructions**, I want to paste my key and see immediate confirmation that it works so that I know I'm ready to analyze pages.

### Returning User (Provider Switching)

- **As a user who already configured OpenRouter**, I want to add a Gemini key alongside it so that I have a backup provider.
- **As a user who wants to switch from OpenRouter to Gemini**, I want to select Gemini as my active provider in one click so that all future analyses use Gemini.
- **As a user who configured multiple providers**, I want to see which one is currently active so that I know which AI is doing my analysis.

### Settings Management

- **As a user who entered the wrong API key**, I want to see a clear "Invalid key" error so that I know to re-enter it.
- **As a user who wants to remove a provider**, I want to delete my API key for that provider so that my credentials aren't stored unnecessarily.
- **As a privacy-conscious user**, I want to know my API keys are stored locally and never sent anywhere except the AI provider so that I trust the extension.

## Requirements

### Must-Have (P0)

**SETTINGS-01: Gear Icon in Popup**
Add a settings entry point to the popup header.

Acceptance Criteria:
- [ ] A gear (⚙) icon appears in the popup header, next to the "BS Detector" title
- [ ] Clicking the gear icon opens the settings page in a new Chrome tab
- [ ] Icon uses CSS/SVG, no external image dependency
- [ ] Icon has hover state and cursor pointer
- [ ] Icon has `title="Settings"` for accessibility

**SETTINGS-02: Settings Page (options.html)**
Create a dedicated settings page registered as the extension's options page.

Acceptance Criteria:
- [ ] Registered in `manifest.json` as `"options_page": "ui/options.html"`
- [ ] Also accessible via Chrome's extension settings (right-click extension icon → Options)
- [ ] Page header: "BS Detector Settings" with extension version number
- [ ] Responsive layout, readable at 400px–1200px width
- [ ] Consistent visual style with the popup (same font family, color palette)
- [ ] A footer with privacy note: "Your API keys are stored locally in your browser and are only sent to the respective AI provider during analysis. They are never transmitted to BS Detector servers."

**SETTINGS-03: Provider Selection**
Users can choose their active AI provider.

Acceptance Criteria:
- [ ] Radio button group or card-based selector for providers: OpenRouter, Google Gemini, Grok
- [ ] Each provider card shows:
  - Provider name and logo/icon
  - Pricing info (e.g., "Free tier available", "$0.001/analysis", "$25 free credits")
  - Status indicator: "Configured" (green) / "Not configured" (grey) / "Invalid key" (red)
  - Current active provider highlighted distinctly
- [ ] Selecting a provider sets it as active in `chrome.storage.local` key `activeProvider`
- [ ] If the selected provider has no API key configured, prompt the user to enter one
- [ ] Default active provider: the first one with a valid key, or OpenRouter if none configured

**SETTINGS-04: API Key Input — OpenRouter**
Dedicated section for OpenRouter configuration.

Acceptance Criteria:
- [ ] Text input field for API key (type: password, with show/hide toggle)
- [ ] Placeholder text: `sk-or-v1-...`
- [ ] "Save" button that stores key in `chrome.storage.local` as `openrouterApiKey`
- [ ] "Delete" button that removes the key from storage
- [ ] Step-by-step setup instructions displayed inline or in expandable section:
  1. Go to [openrouter.ai/keys](https://openrouter.ai/keys)
  2. Create an account (free)
  3. Click "Create Key"
  4. Name it "BS Detector"
  5. Copy the key and paste it here
  6. Note: Free models available, or add $5-10 credits for better reliability
- [ ] After save: validate key format (starts with `sk-or-`)
- [ ] Show saved confirmation: "Key saved ✓"
- [ ] Backward compatible: migrates existing `apiKey` storage key to `openrouterApiKey`

**SETTINGS-05: API Key Input — Google Gemini**
Dedicated section for Gemini configuration.

Acceptance Criteria:
- [ ] Text input field for API key (type: password, with show/hide toggle)
- [ ] Placeholder text: `AIza...`
- [ ] "Save" button stores key in `chrome.storage.local` as `geminiApiKey`
- [ ] "Delete" button removes key from storage
- [ ] Step-by-step setup instructions:
  1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
  2. Sign in with your Google account
  3. Click "Create API key"
  4. Select or create a Google Cloud project
  5. Copy the key and paste it here
  6. Note: Free tier includes 15 requests/minute with Gemini Flash
- [ ] After save: validate key format (starts with `AIza`)
- [ ] Show saved confirmation: "Key saved ✓"

**SETTINGS-06: API Key Input — Grok**
Dedicated section for Grok configuration.

Acceptance Criteria:
- [ ] Text input field for API key (type: password, with show/hide toggle)
- [ ] Placeholder text: `xai-...`
- [ ] "Save" button stores key in `chrome.storage.local` as `grokApiKey`
- [ ] "Delete" button removes key from storage
- [ ] Step-by-step setup instructions:
  1. Go to [console.x.ai](https://console.x.ai)
  2. Create an account (you get $25 free credits)
  3. Navigate to API Keys
  4. Create a new key
  5. Copy the key and paste it here
  6. Note: $25 free credits ≈ thousands of analyses with Grok Fast model
- [ ] After save: validate key format (starts with `xai-`)
- [ ] Show saved confirmation: "Key saved ✓"

**SETTINGS-07: Config Loader Refactor**
Update the config loader to support multiple providers.

Acceptance Criteria:
- [ ] `loadConfig()` returns `{ activeProvider, openrouterApiKey, geminiApiKey, grokApiKey }`
- [ ] `getActiveApiKey()` returns the API key for the currently active provider
- [ ] `getActiveProvider()` returns the provider name string
- [ ] Backward compatibility: if old `apiKey` key exists in storage, migrate it to `openrouterApiKey` and set `activeProvider: 'openrouter'`
- [ ] Migration runs once and cleans up old key
- [ ] Service worker uses `getActiveApiKey()` instead of directly reading `apiKey`

**SETTINGS-08: First-Run Experience**
Guide new users who haven't configured any provider.

Acceptance Criteria:
- [ ] When no API keys are configured and user clicks "Analyze", show a friendly error: "No AI provider configured yet. Click ⚙ to set up your free API key."
- [ ] The error message includes a clickable link/button that opens the settings page
- [ ] Settings page shows a "Getting Started" banner at the top when no providers are configured
- [ ] Banner recommends Gemini as the easiest free option (Google account = instant setup)

**SETTINGS-09: Test Suite**
TDD for all settings-related code.

Acceptance Criteria:
- [ ] Unit tests for config loader refactor (minimum 10 tests):
  - `loadConfig()` returns all provider keys
  - `getActiveApiKey()` returns correct key for each provider
  - `getActiveProvider()` returns stored provider name
  - Default provider when none set
  - Backward migration from old `apiKey` format
  - Migration cleans up old key
  - Invalid provider name handling
  - Missing key for active provider
  - Each key format validation (sk-or-, AIza, xai-)
  - Empty storage returns safe defaults
- [ ] Settings page DOM tests (minimum 8 tests):
  - Gear icon present in popup
  - Gear icon opens options page
  - Provider cards render for all 3 providers
  - Saving a key stores it in chrome.storage.local
  - Deleting a key removes it from storage
  - Active provider selection updates storage
  - Key input masks value (password type)
  - Show/hide toggle works
- [ ] All tests pass with 0 lint errors
- [ ] Coverage maintained at 85%+

### Nice-to-Have (P1)

**SETTINGS-10: Live Key Validation**
After saving a key, make a lightweight API call to verify it works.

Acceptance Criteria:
- [ ] OpenRouter: call `/api/v1/auth/key` endpoint
- [ ] Gemini: call `models.list` endpoint
- [ ] Grok: call `/v1/models` endpoint
- [ ] Show "Key valid ✓" (green) or "Key invalid ✗" (red) next to the input
- [ ] Validation happens asynchronously, doesn't block the save
- [ ] Timeout: 5 seconds, show "Could not verify" on timeout

**SETTINGS-11: Model Selection per Provider**
Let users choose which model to use for each provider.

Acceptance Criteria:
- [ ] Dropdown under each provider section
- [ ] OpenRouter: `meta-llama/llama-3.3-70b-instruct`, `meta-llama/llama-4-maverick`, etc.
- [ ] Gemini: `gemini-2.5-flash-preview-04-17`, `gemini-2.5-flash-lite-preview`, etc.
- [ ] Grok: `grok-4.1-fast`, `grok-4.1`, `grok-4`
- [ ] Show estimated cost per analysis next to each model
- [ ] Stored in `chrome.storage.local` per provider

**SETTINGS-12: Provider Status in Popup**
Show which provider is active in the popup header.

Acceptance Criteria:
- [ ] Small badge or label in popup showing current provider name (e.g., "via Gemini")
- [ ] Badge color matches provider brand color
- [ ] Updates when user switches provider in settings

### Future Considerations (P2)

**SETTINGS-13: Multi-Provider Consensus Mode**
A toggle in settings to enable "analyze with all configured providers and show consensus."

**SETTINGS-14: Usage Tracking Dashboard**
Show per-provider usage stats: analyses count, estimated cost, tokens used.

**SETTINGS-15: Settings Import/Export**
Export settings (minus API keys) as JSON for backup or sharing configs across machines.

## Technical Notes

### Manifest Changes

```json
{
  "options_page": "ui/options.html",
  "permissions": ["activeTab", "storage"]
}
```

No new permissions required — `storage` is already granted.

### Storage Schema (chrome.storage.local)

```
{
  "activeProvider": "openrouter" | "gemini" | "grok",
  "openrouterApiKey": "sk-or-v1-...",
  "geminiApiKey": "AIza...",
  "grokApiKey": "xai-...",
  "openrouterModel": "meta-llama/llama-3.3-70b-instruct",
  "geminiModel": "gemini-2.5-flash-preview-04-17",
  "grokModel": "grok-4.1-fast"
}
```

### Migration from Current Storage

Current: `{ apiKey: "sk-or-v1-..." }`
New: `{ activeProvider: "openrouter", openrouterApiKey: "sk-or-v1-...", ... }`

Migration must be automatic and transparent to the user.

### File Structure (Proposed)

```
src/ui/
  popup.html            # Existing — add gear icon
  popup.css             # Existing — add gear icon styles
  popup.js              # Existing — add gear icon click handler
  options.html          # NEW — settings page markup
  options.css           # NEW — settings page styles
  options.js            # NEW — settings page logic
src/shared/
  config-loader.js      # MODIFIED — multi-provider support
  constants.js          # MODIFIED — provider enum, new defaults
tests/unit/
  config-loader.test.js # MODIFIED — expanded for multi-provider
  settings-ui.test.js   # NEW — DOM tests for options page
```

### UX Wireframe (Text)

```
┌─────────────────────────────────────────────┐
│  ⚙ BS Detector Settings            v0.2.0  │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─ Getting Started ─────────────────────┐  │
│  │ Choose a provider and add your API    │  │
│  │ key to start analyzing pages.         │  │
│  │ Recommended: Google Gemini (free)     │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Choose your AI provider:                   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ ○ OpenRouter                        │   │
│  │   Status: ● Configured              │   │
│  │   Free models + paid ($0.001/query) │   │
│  │                                      │   │
│  │   API Key: [••••••••••••] 👁 [Save]  │   │
│  │   [Delete key]                       │   │
│  │                                      │   │
│  │   ▸ How to get an OpenRouter key     │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ ● Google Gemini              ACTIVE  │   │
│  │   Status: ● Configured              │   │
│  │   Free tier (15 req/min)            │   │
│  │                                      │   │
│  │   API Key: [••••••••••••] 👁 [Save]  │   │
│  │   [Delete key]                       │   │
│  │                                      │   │
│  │   ▸ How to get a Gemini key          │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ ○ Grok (xAI)                        │   │
│  │   Status: ○ Not configured          │   │
│  │   $25 free credits on signup        │   │
│  │                                      │   │
│  │   API Key: [________________] 👁 [Save] │
│  │                                      │   │
│  │   ▸ How to get a Grok key            │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ─────────────────────────────────────────  │
│  Your API keys are stored locally in your   │
│  browser and are only sent to the AI        │
│  provider during analysis. They are never   │
│  transmitted to BS Detector servers.        │
└─────────────────────────────────────────────┘
```

## Open Questions

- **[Design]** Should the settings page use the same dark background as the popup, or follow Chrome's extension options page convention (light background)?
- **[Product]** Should we show a "Test connection" button next to each provider, or is save-and-validate-automatically enough?
- **[Engineering]** The content script and popup are separate contexts — when the user saves settings on the options page, does the service worker need to be notified to reload config? (Answer: No — `chrome.storage.local` changes are visible immediately to the service worker on next read. But we could add a `storage.onChanged` listener for real-time updates.)
- **[Product]** What is the recommended provider order? Current thinking: Gemini first (easiest free setup), then OpenRouter (most model flexibility), then Grok (best for power users).

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Settings page test coverage | ≥ 85% | `vitest --coverage` |
| Time from install to first analysis (new user) | < 3 minutes | Manual timing test with 3 non-technical testers |
| Settings page renders correctly | 100% on Chrome 120+ | Manual cross-browser check |
| Successful key save/load round-trip | 100% for all 3 providers | Automated test |
| Migration from old storage format | Zero data loss | Automated test |

## Dependencies

- **GEMINI-01 (Provider Interface Contract)** — The config loader refactor should align with the provider interface.
- This spec is a **prerequisite** for Gemini and Grok provider specs — users need a way to enter their keys.
- However, the provider adapters can be developed in parallel as long as the storage schema is agreed upon.
