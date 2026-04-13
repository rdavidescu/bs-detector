# Feature Spec: Grok (xAI) Provider Integration

**Status:** Draft
**Author:** tsk + Claude
**Date:** 2026-04-13
**Epic:** Multi-Provider Support
**Priority:** P1

---

## Problem Statement

Having only one or two AI providers limits BS Detector's resilience and scoring accuracy. Different models have different strengths — our walking skeleton showed that a single model can produce scores that vary significantly from a thorough manual analysis. Adding Grok as a third provider increases availability, enables future multi-engine consensus scoring, and gives users access to xAI's models which may have different analytical biases than Meta's Llama or Google's Gemini.

Grok offers $25 free credits on signup (no credit card required for initial credits), and its cheapest model (Grok 4.1 Fast) costs $0.20/M input tokens — making a full page analysis cost roughly $0.001-0.005. The API is OpenAI-compatible, which means integration effort is minimal compared to Gemini.

## Goals

1. Users can analyze pages using Grok as a third provider option
2. Implementation leverages Grok's OpenAI-compatible API format for minimal adapter code
3. $25 free signup credits provide thousands of analyses without payment
4. Test coverage matches other provider adapters (≥ 12 unit tests)
5. Provider abstraction layer (built in Gemini spec GEMINI-01) remains clean with Grok as the third implementation

## Non-Goals

- **Grok-specific prompt tuning** — Same prompt template used across all providers. Model-specific optimization is a separate initiative.
- **X/Twitter integration** — Grok has special access to X data. This is interesting for future social media BS detection but out of scope here.
- **Grok 4 (flagship) support** — Focus on Grok 4.1 Fast ($0.20/M tokens). The flagship Grok 4 at $3.00/M is expensive and unnecessary for this use case.
- **Free tier negotiation** — We won't build flows to maximize free credits. Users who exhaust the $25 can add more or switch providers.

## User Stories

### Chrome Extension User

- **As a user who wants access to multiple AI perspectives**, I want to switch to Grok analysis so that I can compare how different models evaluate the same content.
- **As a new user**, I want to use xAI's $25 free signup credits so that I can analyze thousands of pages before deciding if I want to pay.
- **As a user who already uses Grok/xAI for other projects**, I want to paste my existing API key into BS Detector and start analyzing immediately.
- **As a user in a region where Google services are restricted**, I want an alternative to Gemini that works for me.

### Developer

- **As a developer implementing the Grok adapter**, I want to reuse most of the OpenRouter adapter code since both use OpenAI-compatible APIs, reducing implementation time.
- **As a developer writing tests**, I want the Grok adapter test suite to follow the same structure as OpenRouter and Gemini for consistency.

## Requirements

### Must-Have (P0)

**GROK-01: Grok API Adapter**
Implement the adapter for xAI's Grok API.

Acceptance Criteria:
- [ ] Calls `https://api.x.ai/v1/chat/completions` (xAI's OpenAI-compatible endpoint)
- [ ] Authenticates via `Authorization: Bearer {apiKey}` header
- [ ] Default model: `grok-4.1-fast` ($0.20/M input, $0.50/M output)
- [ ] Message format: OpenAI-compatible `messages: [{role, content}]` — same as OpenRouter
- [ ] System message passed as `messages[0]` with `role: "system"` — same as OpenRouter
- [ ] JSON mode via `response_format: { type: "json_object" }`
- [ ] Timeout via AbortController (same pattern as other adapters)
- [ ] Error classification: 401/403→`invalid_key`, 429→`rate_limited`, 500+→`provider_error`, AbortError→`timeout`
- [ ] Returns parsed text from `choices[0].message.content`
- [ ] Implements the provider interface contract from GEMINI-01

**GROK-02: Constants and Config**
Add Grok-specific constants.

Acceptance Criteria:
- [ ] `PROVIDERS` enum updated: `GROK: 'grok'`
- [ ] `PROVIDER_DEFAULTS` expanded with `GROK_API_URL`, `GROK_DEFAULT_MODEL`, `GROK_TIMEOUT_MS`
- [ ] Config loader reads `grokApiKey` from `chrome.storage.local`
- [ ] `validateConfig()` validates Grok keys (format: `xai-` prefix)
- [ ] Constants test updated for new entries

**GROK-03: Pipeline Integration**
Register Grok adapter in the adapter factory.

Acceptance Criteria:
- [ ] `getAdapter('grok')` returns the Grok adapter
- [ ] Pipeline works with `provider: 'grok'` parameter
- [ ] Provider name included in result metadata
- [ ] Error messages include "Grok" provider name for user clarity

**GROK-04: Comprehensive Test Suite**
TDD — tests RED first, then implementation.

Acceptance Criteria:
- [ ] Unit tests for Grok adapter (minimum 11 tests):
  - POST to correct xAI URL
  - Authorization Bearer header present
  - OpenAI-compatible message format
  - System message as first message with role "system"
  - JSON response_format configured
  - Successful response extracted from `choices[0].message.content`
  - `invalid_key` on 401/403
  - `rate_limited` on 429
  - `provider_error` on 500+
  - `timeout` on AbortError
  - `network_error` on generic error
- [ ] Integration test: full pipeline with mocked Grok responses (minimum 2 tests)
- [ ] All tests pass with 0 lint errors
- [ ] Coverage thresholds maintained at 85%+

### Nice-to-Have (P1)

**GROK-05: Credit Balance Warning**
Show a warning when the user's Grok credits are running low.

Acceptance Criteria:
- [ ] After each Grok analysis, check `usage.cost` from the response
- [ ] Track cumulative cost in `chrome.storage.local`
- [ ] Show a warning banner in popup when estimated remaining credits < $1

**GROK-06: Grok Model Upgrade Path**
Let users select between Grok models in settings.

Acceptance Criteria:
- [ ] Settings dropdown: Grok 4.1 Fast (cheap), Grok 4.1 (mid), Grok 4 (premium)
- [ ] Show estimated cost per analysis for each model
- [ ] Default: Grok 4.1 Fast

### Future Considerations (P2)

**GROK-07: X/Twitter Content Analysis**
Leverage Grok's access to X data for enhanced analysis of tweets and X-linked articles.

**GROK-08: Real-time Fact Checking**
Use Grok's web search capabilities (if exposed via API) to cross-reference claims in real-time.

## Technical Notes

### Grok API vs OpenRouter — Similarities

Since both are OpenAI-compatible, the Grok adapter can share significant code with the OpenRouter adapter:

| Aspect | OpenRouter | Grok (xAI) | Same? |
|--------|-----------|-------------|-------|
| Auth | `Bearer {key}` | `Bearer {key}` | Yes |
| Messages format | `messages: [{role, content}]` | `messages: [{role, content}]` | Yes |
| System prompt | `role: "system"` in messages | `role: "system"` in messages | Yes |
| JSON mode | `response_format: {type: "json_object"}` | `response_format: {type: "json_object"}` | Yes |
| Response path | `choices[0].message.content` | `choices[0].message.content` | Yes |
| Base URL | `openrouter.ai/api/v1/...` | `api.x.ai/v1/...` | Different |
| Extra headers | `HTTP-Referer`, `X-Title` | None required | Different |

**Implementation approach:** Consider extracting a shared `callOpenAICompatible(params)` base function that both OpenRouter and Grok adapters use, with provider-specific URL and header overrides. This reduces code duplication and makes future OpenAI-compatible providers trivial to add.

### File Structure (Proposed)

```
src/providers/
  provider-interface.js         # From GEMINI-01
  openai-compatible-base.js     # NEW — shared fetch logic
  adapters/
    openrouter.js               # Refactored to use base
    gemini.js                   # From Gemini spec
    grok.js                     # NEW
tests/unit/
  grok-adapter.test.js          # NEW
tests/integration/
  grok-pipeline.test.js         # NEW
```

## Open Questions

- **[Engineering]** Should we extract `openai-compatible-base.js` as part of this issue, or wait until we confirm the pattern works with both OpenRouter and Grok? (Recommendation: do it here, since we have two implementations to validate the abstraction)
- **[Product]** How do we communicate the $25 free credit to users? In the settings page? In the onboarding flow? A tooltip next to the Grok option?
- **[Engineering]** xAI API keys start with `xai-` — need to confirm this is consistent across all key types

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Grok adapter test coverage | ≥ 85% | `vitest --coverage` |
| Grok analysis success rate | ≥ 95% on test articles | Manual smoke test on 10 articles |
| Score consistency (Grok vs OpenRouter) | Within ±20 points on same article | Compare scores on 5 articles |
| Code reuse with OpenRouter adapter | ≥ 60% shared logic | Code review |
| Implementation time | ≤ 50% of Gemini adapter time | Because of OpenAI compatibility |

## Dependencies

- **GEMINI-01 (Provider Interface Contract)** — Must be completed first. The Grok adapter implements this interface.
- **Settings UI spec** — Users need a way to enter their Grok API key. This spec assumes the Settings UI exists.
