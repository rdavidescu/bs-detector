## Problem

API key must currently be set via DevTools console. No normal user will do this. No way to switch providers or see which is active.

Full spec: `docs/specs/settings-ui-provider-config.md`

## What This Delivers

- **Gear icon** in popup header opens settings page in new tab
- **Options page** (`options.html`) registered as Chrome extension options page
- **Provider cards** for OpenRouter, Gemini, Grok with:
  - Radio selection for active provider
  - Password input with show/hide toggle for API key
  - Status indicator: Configured (green) / Not configured (grey) / Invalid (red)
  - Expandable step-by-step instructions with links to get free keys
- **Config loader refactored**: `loadConfig()` returns multi-provider config
- **Backward migration** from current `apiKey` to `openrouterApiKey` format
- **First-run UX**: friendly prompt when no keys configured, recommends Gemini (free)
- **Privacy footer**: keys stored locally, only sent to AI provider

## Storage Schema

```json
{
  "activeProvider": "openrouter" | "gemini" | "grok",
  "openrouterApiKey": "sk-or-v1-...",
  "geminiApiKey": "AIza...",
  "grokApiKey": "xai-..."
}
```

## Acceptance Criteria

- [ ] Gear icon in popup opens options page
- [ ] `manifest.json` includes `options_page`
- [ ] Provider selection persists to `chrome.storage.local`
- [ ] API keys save/load/delete for all 3 providers
- [ ] Key format validation (`sk-or-`, `AIza`, `xai-`)
- [ ] Show/hide toggle on key input fields
- [ ] Migration from old `apiKey` format with zero data loss
- [ ] First-run error message with link to settings when no key configured
- [ ] Settings page shows Getting Started banner when no providers configured
- [ ] Privacy footer present
- [ ] 18+ tests (10 config loader, 8 settings DOM), all GREEN
- [ ] 85%+ coverage, 0 lint errors

## Files to Create/Modify

- `src/ui/options.html` — NEW
- `src/ui/options.css` — NEW
- `src/ui/options.js` — NEW
- `src/ui/popup.html` — add gear icon
- `src/ui/popup.js` — gear icon click handler
- `src/shared/config-loader.js` — multi-provider refactor
- `src/shared/constants.js` — PROVIDERS enum
- `src/manifest.json` — add `options_page`
- `tests/unit/config-loader.test.js` — expanded
- `tests/unit/settings-ui.test.js` — NEW

## TDD

Write failing tests FIRST, then implement. Red -> Green -> Refactor.
