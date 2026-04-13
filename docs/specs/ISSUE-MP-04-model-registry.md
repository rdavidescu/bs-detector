## Problem

We hardcoded `meta-llama/llama-3.1-8b-instruct:free` and it got retired overnight with zero warning. Models come and go fast. Hardcoded model IDs become landmines. We need a mechanism to keep the model list fresh without shipping extension updates.

## Solution: Hybrid Pull + Config

### 1. Model Registry File (repo-hosted)

A curated JSON file in the repo mapping providers to recommended models:

```json
{
  "version": "2026-04-13",
  "providers": {
    "openrouter": {
      "free": [{ "id": "meta-llama/llama-3.3-70b-instruct:free", "name": "Llama 3.3 70B (Free)" }],
      "cheap": [{ "id": "meta-llama/llama-3.3-70b-instruct", "name": "Llama 3.3 70B", "cost_per_1m": 0.40 }]
    },
    "gemini": {
      "free": [{ "id": "gemini-2.5-flash-preview-04-17", "name": "Gemini 2.5 Flash" }]
    },
    "grok": {
      "cheap": [{ "id": "grok-4.1-fast", "name": "Grok 4.1 Fast", "cost_per_1m": 0.20 }]
    }
  }
}
```

Hosted at: `https://raw.githubusercontent.com/rdavidescu/bs-detector/main/config/model-registry.json`

### 2. Extension Pulls on Startup

Service worker fetches registry on startup with 24h cache. Fetch fails? Falls back to bundled defaults. No extension update needed to add/remove models.

### 3. Maintenance Script

`scripts/update-model-registry.js` that:
- Queries each provider model list API
- Filters for free/cheap models suitable for BS detection
- Updates `config/model-registry.json`
- Can run manually or via GitHub Actions weekly cron

### 4. Settings UI Integration

Model dropdown populated from fetched registry instead of hardcoded constants. Shows model name, tier (free/cheap), and status.

## Acceptance Criteria

- [ ] `config/model-registry.json` created with initial model list for all 3 providers
- [ ] Service worker fetches registry on startup with 24h cache in `chrome.storage.local`
- [ ] Graceful fallback to bundled defaults if fetch fails
- [ ] `scripts/update-model-registry.js` queries provider APIs
- [ ] Script validates models respond before marking available
- [ ] Settings UI model dropdown populated from registry (not hardcoded)
- [ ] Default model selection: first available free, fallback to cheapest paid
- [ ] If selected model disappears from registry, auto-fallback to next available
- [ ] User can override auto-selection with manual choice in settings
- [ ] 10+ tests: registry fetch, cache, fallback, model selection, auto-fallback
- [ ] Optional: GitHub Action weekly cron to auto-update registry

## Why Not Query Provider APIs at Runtime?

- API calls require valid keys (user might not have one yet)
- Adds latency to every startup
- Rate limit risk on model list endpoints
- Registry is curated, not every model is good for BS detection

## Files to Create/Modify

- `config/model-registry.json` — NEW
- `src/shared/model-registry-loader.js` — NEW
- `src/ui/options.js` — model dropdown from registry
- `scripts/update-model-registry.js` — NEW
- `.github/workflows/update-models.yml` — NEW (optional)
- `tests/unit/model-registry-loader.test.js` — NEW

## Dependencies

- [MP-01] Settings UI (for model dropdown)
- [MP-02] and [MP-03] (for provider constants)

## TDD

Write failing tests FIRST, then implement. Red -> Green -> Refactor.
