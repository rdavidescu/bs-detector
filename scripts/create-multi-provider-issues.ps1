# Create Multi-Provider Epic issues in GitHub
# Run from the bs-detector repo root in PowerShell

# First, create labels if they don't exist
gh label create "multi-provider" --color "1d76db" --description "Multi-provider support epic" --force
gh label create "ui" --color "d4c5f9" --description "User interface" --force
gh label create "provider" --color "0e8a16" --description "AI provider integration" --force
gh label create "resilience" --color "fbca04" --description "System resilience and reliability" --force

# ============================================================
# Issue 1: Settings UI & Provider Configuration
# ============================================================
gh issue create --title "[MP-01] Settings UI & provider configuration" --label "story,multi-provider,ui" --body @"
## Problem

API key must currently be set via DevTools console (``chrome.storage.local.set``). No normal user will do this. No way to switch providers or see which is active.

Full spec: ``docs/specs/settings-ui-provider-config.md``

## What This Delivers

- **Gear icon** in popup header opens settings page in new tab
- **Options page** (``options.html``) registered as Chrome extension options page
- **Provider cards** for OpenRouter, Gemini, Grok with:
  - Radio selection for active provider
  - Password input with show/hide toggle for API key
  - Status indicator: Configured (green) / Not configured (grey) / Invalid (red)
  - Expandable step-by-step instructions with links to get free keys
- **Config loader refactored**: ``loadConfig()`` returns multi-provider config
- **Backward migration** from current ``apiKey`` to ``openrouterApiKey`` format
- **First-run UX**: friendly prompt when no keys configured, recommends Gemini (free)
- **Privacy footer**: keys stored locally, only sent to AI provider

## Storage Schema

``````json
{
  "activeProvider": "openrouter" | "gemini" | "grok",
  "openrouterApiKey": "sk-or-v1-...",
  "geminiApiKey": "AIza...",
  "grokApiKey": "xai-..."
}
``````

## Acceptance Criteria

- [ ] Gear icon in popup opens options page
- [ ] ``manifest.json`` includes ``options_page``
- [ ] Provider selection persists to ``chrome.storage.local``
- [ ] API keys save/load/delete for all 3 providers
- [ ] Key format validation (``sk-or-``, ``AIza``, ``xai-``)
- [ ] Show/hide toggle on key input fields
- [ ] Migration from old ``apiKey`` format — zero data loss
- [ ] First-run error message with link to settings when no key configured
- [ ] Settings page shows "Getting Started" banner when no providers configured
- [ ] Privacy footer present
- [ ] 18+ tests (10 config loader, 8 settings DOM), all GREEN
- [ ] 85%+ coverage, 0 lint errors

## Files to Create/Modify

- ``src/ui/options.html`` — NEW
- ``src/ui/options.css`` — NEW
- ``src/ui/options.js`` — NEW
- ``src/ui/popup.html`` — add gear icon
- ``src/ui/popup.js`` — gear icon click handler
- ``src/shared/config-loader.js`` — multi-provider refactor
- ``src/shared/constants.js`` — PROVIDERS enum
- ``src/manifest.json`` — add ``options_page``
- ``tests/unit/config-loader.test.js`` — expanded
- ``tests/unit/settings-ui.test.js`` — NEW

## TDD

Write failing tests FIRST, then implement. Red -> Green -> Refactor.
"@

# ============================================================
# Issue 2: Google Gemini Provider Integration
# ============================================================
gh issue create --title "[MP-02] Google Gemini provider integration" --label "story,multi-provider,provider" --body @"
## Problem

Single provider dependency (OpenRouter) means total failure when upstream is down. Gemini offers a free tier (15 req/min) and most Chrome users already have a Google account.

Full spec: ``docs/specs/gemini-provider-integration.md``

## What This Delivers

- **Provider interface contract** (``src/providers/provider-interface.js``) — shared by all adapters
- **Gemini API adapter** handling Google's unique (non-OpenAI) format:
  - Auth: ``?key={apiKey}`` query param (not Bearer header)
  - Messages: ``contents: [{role, parts: [{text}]}]`` (not ``messages``)
  - System prompt: ``systemInstruction`` field (not ``role: system``)
  - JSON mode: ``responseMimeType`` in ``generationConfig``
  - Response: ``candidates[0].content.parts[0].text``
  - Safety filter handling (``finishReason: SAFETY``)
- **Pipeline updated** to select adapter by provider name
- **OpenRouter adapter refactored** to match shared interface
- Default model: ``gemini-2.5-flash-preview-04-17`` (free tier)

## Key Technical Differences: Gemini vs OpenRouter

| Aspect | OpenRouter | Gemini |
|--------|-----------|--------|
| Auth | ``Bearer {key}`` header | ``?key={key}`` query param |
| Messages | ``messages: [{role, content}]`` | ``contents: [{role, parts: [{text}]}]`` |
| System prompt | ``role: "system"`` in messages | ``systemInstruction: {parts: [{text}]}`` |
| JSON mode | ``response_format: {type: "json_object"}`` | ``generationConfig: {responseMimeType: "application/json"}`` |
| Response | ``choices[0].message.content`` | ``candidates[0].content.parts[0].text`` |
| Safety | N/A | ``finishReason: "SAFETY"`` can block response |

## Acceptance Criteria

- [ ] Provider interface contract: ``callProvider(params)`` with standardized input/output
- [ ] All adapters implement: ``{ success, content?, error?, status?, message? }`` return shape
- [ ] Error types standardized: ``invalid_key``, ``rate_limited``, ``provider_error``, ``timeout``, ``network_error``
- [ ] Gemini adapter calls correct URL with key as query param
- [ ] Message format correctly mapped from OpenAI style to Gemini style
- [ ] System message mapped to ``systemInstruction``
- [ ] JSON response mode via ``generationConfig.responseMimeType``
- [ ] Safety filter blocks handled with user-friendly error
- [ ] ``getAdapter('gemini')`` returns Gemini adapter
- [ ] ``getAdapter('openrouter')`` returns refactored OpenRouter adapter
- [ ] Pipeline works identically with ``provider: 'gemini'``
- [ ] Provider name included in result metadata
- [ ] Interface documented in ``src/providers/README.md``
- [ ] 20+ tests (12 adapter, 5 interface, 3 integration), all GREEN
- [ ] 85%+ coverage, 0 lint errors

## Files to Create/Modify

- ``src/providers/provider-interface.js`` — NEW (adapter factory + contract)
- ``src/providers/adapters/gemini.js`` — NEW
- ``src/providers/adapters/openrouter.js`` — refactored to match interface
- ``src/providers/README.md`` — NEW (interface docs)
- ``src/background/analysis-pipeline.js`` — use adapter factory
- ``src/shared/constants.js`` — add Gemini defaults
- ``tests/unit/gemini-adapter.test.js`` — NEW
- ``tests/unit/provider-interface.test.js`` — NEW
- ``tests/integration/gemini-pipeline.test.js`` — NEW

## Dependencies

- [MP-01] Settings UI (for key input)

## TDD

Write failing tests FIRST, then implement. Red -> Green -> Refactor.
"@

# ============================================================
# Issue 3: Grok (xAI) Provider Integration
# ============================================================
gh issue create --title "[MP-03] Grok (xAI) provider integration" --label "story,multi-provider,provider" --body @"
## Problem

Third provider adds resilience and enables future multi-engine consensus scoring. Grok is OpenAI-compatible (minimal code effort) and offers `$25` free credits on signup.

Full spec: ``docs/specs/grok-provider-integration.md``

## What This Delivers

- **Grok adapter** using xAI's OpenAI-compatible API
- **Shared ``openai-compatible-base.js``** extracting common fetch logic from OpenRouter + Grok
- Default model: ``grok-4.1-fast`` (`$0.20`/M tokens)

## Key Insight: Code Reuse

Grok API is OpenAI-compatible — same auth, message format, and response shape as OpenRouter. Only differences: base URL and extra headers.

| Aspect | OpenRouter | Grok (xAI) | Same? |
|--------|-----------|-------------|-------|
| Auth | ``Bearer {key}`` | ``Bearer {key}`` | Yes |
| Messages | ``messages: [{role, content}]`` | ``messages: [{role, content}]`` | Yes |
| JSON mode | ``response_format`` | ``response_format`` | Yes |
| Response | ``choices[0].message.content`` | ``choices[0].message.content`` | Yes |
| Base URL | ``openrouter.ai/api/v1/...`` | ``api.x.ai/v1/...`` | Different |
| Extra headers | ``HTTP-Referer``, ``X-Title`` | None required | Different |

**Implementation approach:** Extract ``openai-compatible-base.js`` shared by OpenRouter and Grok. Future OpenAI-compatible providers become trivial.

## Acceptance Criteria

- [ ] Grok adapter calls ``api.x.ai/v1/chat/completions``
- [ ] Bearer auth, OpenAI message format, JSON ``response_format``
- [ ] Error classification matches other adapters
- [ ] ``openai-compatible-base.js`` shared between OpenRouter and Grok
- [ ] OpenRouter adapter refactored to use shared base (removes duplication)
- [ ] ``getAdapter('grok')`` returns Grok adapter
- [ ] Pipeline works with ``provider: 'grok'``
- [ ] Provider name in result metadata
- [ ] 13+ tests (11 adapter, 2 integration), all GREEN
- [ ] 85%+ coverage, 0 lint errors
- [ ] Code reuse >= 60% with OpenRouter adapter

## Files to Create/Modify

- ``src/providers/openai-compatible-base.js`` — NEW (shared fetch logic)
- ``src/providers/adapters/grok.js`` — NEW
- ``src/providers/adapters/openrouter.js`` — refactored to use shared base
- ``tests/unit/grok-adapter.test.js`` — NEW
- ``tests/integration/grok-pipeline.test.js`` — NEW

## Dependencies

- [MP-01] Settings UI (for key input)
- [MP-02] Gemini (for provider interface contract)

## TDD

Write failing tests FIRST, then implement. Red -> Green -> Refactor.
"@

# ============================================================
# Issue 4: Dynamic Model Discovery
# ============================================================
gh issue create --title "[MP-04] Dynamic model registry: auto-discover available models per provider" --label "story,multi-provider,resilience" --body @"
## Problem

We hardcoded ``meta-llama/llama-3.1-8b-instruct:free`` and it got retired overnight with zero warning. Models come and go fast. Hardcoded model IDs become landmines. We need a mechanism to keep the model list fresh without shipping extension updates.

## Proposed Solution: Hybrid Pull + Config

### 1. Model Registry File (repo-hosted)

A curated JSON file in the repo that maps providers to recommended models:

``````json
{
  "version": "2026-04-13",
  "providers": {
    "openrouter": {
      "free": [
        { "id": "meta-llama/llama-3.3-70b-instruct:free", "name": "Llama 3.3 70B (Free)", "status": "available" }
      ],
      "cheap": [
        { "id": "meta-llama/llama-3.3-70b-instruct", "name": "Llama 3.3 70B", "cost_per_1m": 0.40 }
      ]
    },
    "gemini": {
      "free": [
        { "id": "gemini-2.5-flash-preview-04-17", "name": "Gemini 2.5 Flash", "status": "available" }
      ]
    },
    "grok": {
      "cheap": [
        { "id": "grok-4.1-fast", "name": "Grok 4.1 Fast", "cost_per_1m": 0.20 }
      ]
    }
  }
}
``````

Hosted at: ``https://raw.githubusercontent.com/rdavidescu/bs-detector/main/config/model-registry.json``

### 2. Extension Pulls on Startup

Service worker fetches the registry on startup with 24h cache. If fetch fails, falls back to bundled defaults. No extension update needed to add/remove models.

### 3. Maintenance Script

``scripts/update-model-registry.js`` that:
- Queries each provider's model list API endpoint
- Filters for free/cheap models suitable for BS detection
- Updates ``config/model-registry.json``
- Can be run manually or via GitHub Actions weekly cron

### 4. Settings UI Integration

Model dropdown in settings populated from fetched registry instead of hardcoded constants. Shows model name, tier (free/cheap), and status.

## Acceptance Criteria

- [ ] ``config/model-registry.json`` created with initial model list for all 3 providers
- [ ] Service worker fetches registry on startup with 24h cache in ``chrome.storage.local``
- [ ] Graceful fallback to bundled defaults if fetch fails (network error, 404, etc.)
- [ ] ``scripts/update-model-registry.js`` queries provider APIs:
  - OpenRouter: ``GET /api/v1/models`` -> filter ``:free`` suffix + cheapest paid
  - Gemini: ``GET /v1beta/models`` -> filter free tier
  - Grok: ``GET /v1/models`` -> filter by pricing
- [ ] Script validates models respond to a simple ping before marking "available"
- [ ] Settings UI model dropdown populated from registry (not hardcoded)
- [ ] Default model selection: first available free, fallback to cheapest paid
- [ ] If currently selected model disappears from registry, auto-fallback to next available
- [ ] User can override auto-selection with manual model choice in settings
- [ ] 10+ tests: registry fetch, cache, fallback, model selection logic, auto-fallback
- [ ] Optional: GitHub Action (weekly cron) to auto-update registry and open PR if changes detected

## Why Not Query Provider APIs at Runtime?

- API calls require valid keys (user might not have one yet)
- Adds latency to every startup
- Rate limit risk on model list endpoints
- Registry is curated — not every model is good for BS detection

## Files to Create/Modify

- ``config/model-registry.json`` — NEW
- ``src/shared/model-registry-loader.js`` — NEW (fetch + cache + fallback)
- ``src/ui/options.js`` — model dropdown from registry
- ``scripts/update-model-registry.js`` — NEW (maintenance script)
- ``.github/workflows/update-models.yml`` — NEW (optional weekly cron)
- ``tests/unit/model-registry-loader.test.js`` — NEW

## Dependencies

- [MP-01] Settings UI (for model dropdown)
- [MP-02] and [MP-03] (for provider constants)

## Future: Community Contributions

The model registry can accept PRs from community members who discover good free/cheap models. Low barrier to contribute.

## TDD

Write failing tests FIRST, then implement. Red -> Green -> Refactor.
"@

Write-Host "`n=== All 4 issues created! ===" -ForegroundColor Green
