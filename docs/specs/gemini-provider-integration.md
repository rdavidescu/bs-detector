# Feature Spec: Google Gemini Provider Integration

**Status:** Draft
**Author:** tsk + Claude
**Date:** 2026-04-13
**Epic:** Multi-Provider Support
**Priority:** P0

---

## Problem Statement

BS Detector currently depends on a single AI provider (OpenRouter) for content analysis. During the Walking Skeleton smoke test, all free model providers on OpenRouter were simultaneously rate-limited upstream, making the extension completely unusable until the user purchased credits. This single point of failure undermines the core product promise of accessible BS detection.

Google Gemini offers a free tier (Gemini 2.5 Flash) with 15 requests/minute — generous enough for casual use — and most Chrome users already have a Google account, making API key generation frictionless. Adding Gemini as a provider gives users a zero-cost alternative and makes the extension more resilient.

## Goals

1. Users can analyze pages using Google Gemini as an alternative to OpenRouter
2. Gemini free tier (Flash) works without any payment or credit card
3. The provider abstraction layer supports swapping/adding providers without modifying the pipeline
4. Test coverage for the Gemini adapter matches or exceeds the OpenRouter adapter coverage (currently 11 tests)
5. Scores from Gemini are comparable to OpenRouter for the same content (within ±15 points on the BS scale)

## Non-Goals

- **Multi-provider consensus scoring** — Running multiple providers in parallel and comparing results is a separate feature. This spec covers Gemini as a standalone alternative.
- **Google OAuth / Chrome identity integration** — Automatically using the user's Chrome Google login to authenticate with Gemini API. The user will generate their own API key from Google AI Studio. OAuth adds complexity and permission prompts that may scare users.
- **Gemini Pro or paid tier support** — Focus on the free Flash model. Paid models can be added later as a configuration option.
- **Prompt optimization per model** — The same Quick Scan prompt template will be used for all providers. Model-specific prompt tuning is a future optimization.

## User Stories

### Chrome Extension User

- **As a user who doesn't want to pay for AI**, I want to use Google Gemini's free tier so that I can analyze pages without spending money.
- **As a user setting up BS Detector for the first time**, I want clear instructions on how to get a free Gemini API key so that I can start analyzing pages in under 2 minutes.
- **As a user whose OpenRouter analysis fails**, I want to easily switch to Gemini so that I'm not blocked by one provider being down.
- **As a user who already has a Gemini API key** from other projects, I want to paste it into BS Detector settings and start using it immediately.

### Developer

- **As a developer adding a new AI provider**, I want a clear provider interface/contract so that I can implement a new adapter without modifying the pipeline.
- **As a developer writing tests**, I want the Gemini adapter to follow the same patterns as OpenRouter so that test structure is consistent and predictable.

## Requirements

### Must-Have (P0)

**GEMINI-01: Provider Interface Contract**
Create a shared interface that all provider adapters must implement.

Acceptance Criteria:
- [ ] A provider adapter exports a `callProvider(params)` function
- [ ] `params` shape: `{ messages: Array<{role, content}>, apiKey: string, model?: string, timeoutMs?: number }`
- [ ] Return shape: `{ success: boolean, content?: string, error?: string, status?: number, message?: string }`
- [ ] Error types standardized across providers: `invalid_key`, `rate_limited`, `provider_error`, `timeout`, `network_error`
- [ ] Existing OpenRouter adapter refactored to match this interface
- [ ] Interface documented in a `src/providers/README.md`

**GEMINI-02: Gemini API Adapter**
Implement the adapter for Google Gemini API (Google AI Studio / Generative Language API).

Acceptance Criteria:
- [ ] Calls `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- [ ] Authenticates via `?key={apiKey}` query parameter (Google AI Studio style)
- [ ] Default model: `gemini-2.5-flash-preview-04-17` (free tier)
- [ ] Maps OpenAI-style `messages[]` to Gemini's `contents[]` format: `{ role: "user"|"model", parts: [{ text }] }`
- [ ] System message passed via `systemInstruction` field (not in contents array)
- [ ] Requests JSON output via `responseMimeType: "application/json"` in `generationConfig`
- [ ] Timeout via AbortController (same pattern as OpenRouter)
- [ ] Error classification: 400→`invalid_request`, 401/403→`invalid_key`, 429→`rate_limited`, 500+→`provider_error`
- [ ] Handles Gemini-specific error format: `{ error: { code, message, status } }`
- [ ] Returns parsed text from `response.candidates[0].content.parts[0].text`
- [ ] Handles safety filter blocks (candidate with `finishReason: "SAFETY"`) gracefully with user-friendly error

**GEMINI-03: Pipeline Integration**
The analysis pipeline selects the correct adapter based on the user's configured provider.

Acceptance Criteria:
- [ ] `analysis-pipeline.js` accepts a `provider` parameter (default: current provider from config)
- [ ] A `getAdapter(providerName)` function returns the correct adapter module
- [ ] Pipeline works identically regardless of which provider is selected
- [ ] If the configured provider fails, error message includes the provider name for debugging
- [ ] Provider name included in the analysis result metadata (`result.provider`)

**GEMINI-04: Constants and Config**
Add Gemini-specific constants alongside existing OpenRouter defaults.

Acceptance Criteria:
- [ ] `PROVIDER_DEFAULTS` expanded with `GEMINI_API_URL`, `GEMINI_FREE_MODEL`, and `GEMINI_TIMEOUT_MS`
- [ ] Provider names enum: `PROVIDERS = { OPENROUTER: 'openrouter', GEMINI: 'gemini' }`
- [ ] Config loader updated to read `provider` and `geminiApiKey` from `chrome.storage.local`
- [ ] `validateConfig()` validates Gemini keys (typically start with `AIza`)

**GEMINI-05: Comprehensive Test Suite**
TDD — tests written RED first, then implementation.

Acceptance Criteria:
- [ ] Unit tests for Gemini adapter (minimum 12 tests, matching OpenRouter coverage):
  - POST to correct Gemini URL with model in path
  - API key passed as query parameter
  - Messages correctly mapped from OpenAI format to Gemini format
  - System message mapped to `systemInstruction`
  - JSON response mode configured via `generationConfig`
  - Successful response extracted from `candidates[0].content.parts[0].text`
  - `invalid_key` on 401/403
  - `rate_limited` on 429
  - `provider_error` on 500+
  - `timeout` on AbortError
  - `network_error` on generic error
  - Safety filter block handled gracefully
- [ ] Unit tests for provider interface / adapter factory (minimum 5 tests):
  - Returns OpenRouter adapter for 'openrouter'
  - Returns Gemini adapter for 'gemini'
  - Throws on unknown provider name
  - All adapters match the interface contract (return shape)
  - Default provider falls back correctly
- [ ] Integration test: full pipeline with mocked Gemini responses (minimum 3 tests)
- [ ] All tests pass with 0 lint errors
- [ ] Coverage thresholds maintained at 85%+

### Nice-to-Have (P1)

**GEMINI-06: Gemini API Key Validation on Save**
When the user saves a Gemini API key, make a lightweight validation call.

Acceptance Criteria:
- [ ] On key save, call `models.list` endpoint to verify key is valid
- [ ] Show "Key valid" or "Invalid key" feedback in settings UI
- [ ] Validation timeout: 5 seconds max

**GEMINI-07: Model Selection**
Let users pick from available Gemini models.

Acceptance Criteria:
- [ ] Settings UI shows a dropdown of Gemini models (Flash, Flash-Lite)
- [ ] Default: `gemini-2.5-flash-preview-04-17`
- [ ] Model choice stored in `chrome.storage.local`

### Future Considerations (P2)

**GEMINI-08: Automatic Fallback**
If the primary provider fails (rate limit, timeout), automatically retry with the secondary provider.

**GEMINI-09: Google OAuth Integration**
Use Chrome's `chrome.identity` API to authenticate with Google directly, eliminating the need for manual API key setup.

**GEMINI-10: Gemini Grounding with Google Search**
Use Gemini's built-in Google Search grounding to cross-reference claims — could dramatically improve BS detection accuracy.

## Technical Notes

### Gemini API vs OpenAI API — Key Differences

| Aspect | OpenRouter (OpenAI-compatible) | Gemini (Google AI Studio) |
|--------|-------------------------------|---------------------------|
| Auth | `Authorization: Bearer {key}` header | `?key={key}` query param |
| Messages format | `messages: [{role, content}]` | `contents: [{role, parts: [{text}]}]` |
| System prompt | `messages[0].role = "system"` | `systemInstruction: {parts: [{text}]}` |
| JSON mode | `response_format: {type: "json_object"}` | `generationConfig: {responseMimeType: "application/json"}` |
| Response path | `choices[0].message.content` | `candidates[0].content.parts[0].text` |
| Safety | N/A | `finishReason: "SAFETY"` can block response |

### File Structure (Proposed)

```
src/providers/
  provider-interface.js    # Shared contract / adapter factory
  adapters/
    openrouter.js          # Existing (refactored to match interface)
    gemini.js              # NEW
tests/unit/
  gemini-adapter.test.js   # NEW
  provider-interface.test.js # NEW
tests/integration/
  gemini-pipeline.test.js  # NEW
```

## Open Questions

- **[Engineering]** Does Gemini's free tier enforce any content-type restrictions that could affect news article analysis? (e.g., safety filters blocking political content)
- **[Engineering]** The Gemini API model names change with preview versions (e.g., `gemini-2.5-flash-preview-04-17`). How do we handle model name rotation without breaking the extension?
- **[Product]** Should we recommend Gemini as the default for new users (since it's free) or keep OpenRouter as default?

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Gemini adapter test coverage | ≥ 85% | `vitest --coverage` |
| Gemini analysis success rate | ≥ 90% on test articles | Manual smoke test on 10 articles |
| Score consistency (Gemini vs OpenRouter) | Within ±15 points on same article | Compare scores on 5 articles |
| Setup time for new user with Gemini | < 2 minutes from install to first analysis | Manual timing test |
