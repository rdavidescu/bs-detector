# BS Detector — Testing Strategy

**Status:** Accepted  
**Date:** 2026-04-11  
**Framework:** Vitest  
**Approach:** Test-Driven Development (TDD)  
**Version:** 1.0

---

## 1. Philosophy

### 1.1 TDD as default workflow

Every implementation issue follows a TDD cycle:

1. **Red** — write a failing test that defines the expected behavior
2. **Green** — write the minimum code to make the test pass
3. **Refactor** — clean up while keeping tests green

This applies to all code written for the extension. Tests are not an afterthought — they are the first line of code in every story. If a story doesn't have a clear test, the story isn't ready for sprint.

### 1.2 Definition of Done (testing gate)

A story is not "Done" unless:
- All unit tests pass
- New code has corresponding tests written before implementation
- Integration tests pass for affected flows
- No regressions in existing test suite
- Test coverage does not decrease

### 1.3 What we don't test

- Chrome API internals (we mock `chrome.*` APIs)
- Third-party AI model behavior (we test our handling of responses, not the model itself)
- CSS rendering (no visual regression for MVP)
- Trivial getters/setters with no logic

---

## 2. Test Pyramid

```
           ╱  Manual  ╲           5 sessions
          ╱  (25+ URLs) ╲         Real providers, real pages
         ╱────────────────╲
        ╱   E2E / Smoke    ╲      ~5 tests
       ╱  (extension loaded) ╲    Full flow, mocked API
      ╱────────────────────────╲
     ╱     Integration Tests    ╲  ~20 tests
    ╱  (component boundaries)    ╲ Real modules, mocked I/O
   ╱──────────────────────────────╲
  ╱         Unit Tests             ╲ ~80+ tests
 ╱  (pure functions, isolated logic) ╲ Fast, no I/O, no Chrome APIs
╱──────────────────────────────────────╲
```

**Ratio target (MVP):** ~70% unit / ~20% integration / ~5% E2E / ~5% manual

---

## 3. Test Framework & Tooling

| Tool | Purpose |
|------|---------|
| **Vitest** | Test runner + assertions (fast, ESM-native, watch mode) |
| **vitest-chrome-mock** or manual mocks | Mock `chrome.storage`, `chrome.runtime`, `chrome.tabs` APIs |
| **msw (Mock Service Worker)** | Mock HTTP responses from OpenRouter API |
| **happy-dom** | Lightweight DOM for content script tests (no real browser) |
| **c8 / istanbul** | Coverage reporting (built into Vitest) |

### 3.1 Project setup

```
bs-detector/
├── vitest.config.js
├── tests/
│   ├── unit/
│   │   ├── prompt-engine.test.js
│   │   ├── response-parser.test.js
│   │   ├── score-calculator.test.js
│   │   ├── content-extractor.test.js
│   │   ├── content-trimmer.test.js
│   │   ├── fallback-controller.test.js
│   │   ├── storage-manager.test.js
│   │   └── provider-manager.test.js
│   ├── integration/
│   │   ├── analysis-pipeline.test.js
│   │   ├── openrouter-adapter.test.js
│   │   ├── message-routing.test.js
│   │   └── onboarding-flow.test.js
│   ├── e2e/
│   │   └── smoke.test.js
│   ├── fixtures/
│   │   ├── sample-pages/           # Extracted content from real URLs
│   │   ├── api-responses/          # Mocked OpenRouter responses (valid + malformed)
│   │   └── expected-results/       # Expected parsed outputs for fixture inputs
│   └── mocks/
│       ├── chrome-api.js           # chrome.storage, chrome.runtime, chrome.tabs
│       └── openrouter-api.js       # MSW handlers for OpenRouter endpoints
├── tests/manual/
│   └── url-test-battery.md         # 25+ URLs with expected score ranges
```

---

## 4. Unit Tests — What and How

Unit tests cover **pure logic** with no external dependencies. These run in milliseconds.

### 4.1 Prompt Engine

| Test Case | What It Verifies |
|-----------|-----------------|
| Template selection by mode | Quick mode → quick template, Standard → standard template |
| Variable injection | All `{{placeholders}}` replaced with actual values |
| No unresolved placeholders | Output contains no `{{...}}` patterns |
| Content trimming | Content exceeding budget is truncated with marker |
| Content type passed through | Detected type injected correctly |
| Empty content handling | Graceful error when content is empty or below minimum |
| Token budget respected | Output content fits within configured token limit |

### 4.2 Response Parser

| Test Case | What It Verifies |
|-----------|-----------------|
| Valid JSON parse | Well-formed JSON → correct AnalysisResult object |
| Missing fields | Partial JSON → fills defaults, doesn't crash |
| Invalid scores | Scores outside 0–10 → clamped or flagged |
| Malformed JSON fallback | Broken JSON → attempt text regex extraction |
| Text-format parse | Non-JSON response → regex extracts scores and fields |
| Empty response | Empty string → returns error result, not crash |
| Extra fields ignored | Unknown fields in JSON → silently ignored |

### 4.3 Score Calculator

| Test Case | What It Verifies |
|-----------|-----------------|
| Weighted calculation | Known inputs → exact expected BS Score |
| All zeros | 0/0/0/0/0 → BS Score = 0 |
| All tens | 10/10/10/10/10 → BS Score = 100 |
| Rounding | Fractional results → rounded to nearest integer |
| Band classification | Score → correct band label (low/mild/mixed/high/very high) |
| Partial scores | Some dimensions missing → calculate with available, flag incomplete |

### 4.4 Content Extractor

| Test Case | What It Verifies |
|-----------|-----------------|
| Basic text extraction | HTML body → clean text output |
| Article tag priority | `<article>` content preferred over full body |
| Selection override | Selected text → takes priority over full page |
| Metadata extraction | Title, URL, OG tags → correctly captured |
| Content type detection | URL patterns + DOM signals → correct type enum |
| Boilerplate stripping | Nav, footer, sidebar → excluded from extracted content |
| Minimum content check | < 100 chars → returns error signal |

### 4.5 Content Trimmer

| Test Case | What It Verifies |
|-----------|-----------------|
| Under budget | Short content → returned as-is |
| Over budget | Long content → truncated at budget with marker |
| Character estimation | Budget in tokens → correct char limit applied (×4) |
| Truncation marker | Truncated content → ends with `[content truncated...]` |
| Preserves word boundaries | Truncation doesn't cut mid-word |

### 4.6 Fallback Controller

| Test Case | What It Verifies |
|-----------|-----------------|
| First attempt succeeds | No fallback triggered |
| Retry on failure | First fail → retry once after delay |
| Downgrade mode | Retry fails → switches Standard to Quick |
| Partial extraction | All retries exhausted → returns partial result |
| Rate limit detection | HTTP 429 → triggers retry with backoff |
| Timeout handling | No response within 30s → triggers fallback |
| Invalid key detection | HTTP 401 → skips retry, surfaces key error |

### 4.7 Storage Manager

| Test Case | What It Verifies |
|-----------|-----------------|
| Save and retrieve key | Store API key → retrieve same value |
| Save and retrieve settings | Store settings object → retrieve intact |
| Default settings | No settings stored → returns defined defaults |
| Clear key | Delete API key → returns empty on next read |
| Key never in sync storage | Verify key only touches `chrome.storage.local`, never `.sync` |

### 4.8 Provider Manager

| Test Case | What It Verifies |
|-----------|-----------------|
| Route to correct adapter | OpenRouter config → OpenRouter adapter called |
| Request format | Payload → correctly formatted OpenAI-compatible request |
| Auth header | API key → Bearer token in Authorization header |
| Required headers | `HTTP-Referer` and `X-Title` present |
| JSON mode flag | `response_format` set correctly when model supports it |

---

## 5. Integration Tests — Boundary Verification

Integration tests verify that **components work together correctly**. They use real module code but mock external I/O (Chrome APIs, network).

### 5.1 Analysis Pipeline (end-to-end internal flow)

| Test Case | What It Verifies |
|-----------|-----------------|
| Happy path | Content → prompt → API call → parse → score → result |
| Malformed API response | Pipeline handles bad response without crashing |
| Fallback triggers | API failure → fallback sequence executes correctly |
| State transitions | Pipeline emits correct state updates (extracting → analyzing → complete) |
| Mode switching | Quick vs Standard → different prompts sent, different output depth |

### 5.2 OpenRouter Adapter (mocked HTTP)

| Test Case | What It Verifies |
|-----------|-----------------|
| Successful request | Mocked 200 → parsed response returned |
| Rate limit (429) | Mocked 429 → returns rate_limited error with retry-after |
| Server error (500) | Mocked 500 → returns provider_error |
| Timeout | No response → returns timeout error |
| Invalid key (401) | Mocked 401 → returns invalid_key error |
| JSON mode response | Mocked JSON response → correctly parsed |
| Non-JSON response | Mocked text response → triggers text parser |

### 5.3 Message Routing

| Test Case | What It Verifies |
|-----------|-----------------|
| ANALYZE_REQUEST received | Background worker triggers pipeline |
| TRIGGER_ANALYSIS from popup | Correct mode passed to pipeline |
| EXTRACT_CONTENT to content script | Content script receives extraction request |
| ANALYSIS_STATE updates | Popup receives state transitions |
| ANALYSIS_RESULT delivered | Final result reaches popup |

### 5.4 Onboarding Flow

| Test Case | What It Verifies |
|-----------|-----------------|
| No key → onboarding shown | First analyze click with no key → onboarding UI |
| Key saved | User enters key → stored in chrome.storage.local |
| Connection test pass | Valid key → "Connected" confirmation |
| Connection test fail | Invalid key → error message |
| Skip → analyze blocked | No key + skip → analyze shows "key required" error |

---

## 6. E2E / Smoke Tests

Minimal tests that load the actual extension in a test browser context and verify the critical path works. These are slow and run less frequently (CI only, not watch mode).

| Test Case | What It Verifies |
|-----------|-----------------|
| Extension loads | Manifest valid, service worker registers, popup opens |
| Analyze button triggers flow | Click → state changes visible in popup |
| Results render | Mocked API → scores and claims appear in popup |
| Settings persist | Change mode → reload → setting retained |
| Error state renders | Mocked API failure → error message visible |

### 6.1 E2E tooling

Use **Playwright** with Chrome extension support (`--load-extension` flag) or the **Chrome Extension Testing Library** for lightweight browser automation. MSW intercepts API calls so no real OpenRouter traffic during CI.

---

## 7. Manual Test Battery — 25+ Reference URLs

The manual test battery is a curated set of real URLs that represent different content types and expected BS score ranges. This battery serves three purposes:

1. **Calibration** — verify that scores land in expected bands for known content
2. **Cross-model evaluation** — when we add providers, run the same battery to compare scoring consistency
3. **Regression detection** — after prompt changes, re-run to check for drift

### 7.1 URL categories (minimum 25)

| Category | Count | Score Range Expected | Examples |
|----------|-------|---------------------|----------|
| Quality journalism | 3 | 0–25 (low BS) | Reuters, AP News, BBC factual reporting |
| Scientific papers / abstracts | 2 | 0–20 (low BS) | PubMed, Nature abstracts |
| Opinion / editorial (transparent) | 3 | 20–40 (mild) | Clearly labeled opinion columns |
| Clickbait news | 3 | 50–75 (high) | Sensationalized headlines, thin sourcing |
| Health misinformation | 3 | 65–90 (high-very high) | Miracle cure claims, anti-evidence framing |
| Political spin | 3 | 45–75 (mixed-high) | Partisan framing, selective facts |
| Social media posts | 3 | varies | Twitter threads, Reddit posts, LinkedIn hot takes |
| Product pages / marketing | 2 | 30–60 (mild-mixed) | Product claims, "best in class" language |
| Satire / parody | 2 | depends | The Onion, Babylon Bee — tests if AI detects satire |
| Forum / discussion | 2 | varies | Stack Overflow answer, Reddit discussion |

**Total: 26 minimum**

### 7.2 Test battery format

Each entry in `tests/manual/url-test-battery.md`:

```markdown
### [Category] — [Short description]
- **URL:** https://example.com/article
- **Content type:** article | social_post | video_page | forum | product_page
- **Expected BS band:** low | mild | mixed | high | very_high
- **Expected score range:** XX–YY
- **Key signals to verify:**
  - [ ] Evidence Weakness score aligns with sourcing quality
  - [ ] Emotional Pressure reflects tone accurately
  - [ ] Red flags are concrete and defensible
- **Notes:** [anything unusual about this page]
```

### 7.3 When to run the battery

- After any prompt template change
- After adding a new provider adapter (comparative run)
- Before each Chrome Web Store submission
- Monthly for drift detection

### 7.4 Cross-model evaluation (post-MVP)

When multiple providers are available, the battery becomes an eval framework:

| URL | OpenRouter Free | Gemini | Groq | Delta |
|-----|----------------|--------|------|-------|
| reuters.com/... | 12 | 15 | 10 | ±5 |
| clickbait.com/... | 68 | 72 | 65 | ±7 |

Acceptable delta: ±15 points between models for same content. Deltas > 15 trigger prompt review.

---

## 8. Coverage Targets

| Layer | Target | Rationale |
|-------|--------|-----------|
| Unit tests | 85%+ line coverage | Core logic must be well-covered |
| Integration tests | Critical paths covered | Every happy path + major error path |
| E2E | Smoke-level only | Verify extension loads and critical flow works |
| Manual battery | 25+ URLs across 10 categories | Calibration and regression |

### 8.1 Coverage exclusions

These are excluded from coverage metrics (but not from testing entirely):
- Chrome API mock setup code
- UI rendering code (popup HTML/CSS) — tested manually
- Third-party library code

---

## 9. CI Pipeline

```
┌─────────────────────────────────────────────┐
│              On every push / PR              │
│                                              │
│  1. Lint (ESLint)                            │
│  2. Unit tests (Vitest, ~5 seconds)          │
│  3. Integration tests (Vitest + MSW, ~15s)   │
│  4. Coverage check (fail if < 85%)           │
│  5. Build extension (verify manifest valid)  │
│                                              │
├─────────────────────────────────────────────┤
│           On merge to main only              │
│                                              │
│  6. E2E smoke tests (Playwright, ~60s)       │
│  7. Extension package build                  │
│                                              │
├─────────────────────────────────────────────┤
│         Manual (release candidate)           │
│                                              │
│  8. Full URL battery test (25+ URLs)         │
│  9. Cross-model comparison (when available)  │
│                                              │
└─────────────────────────────────────────────┘
```

---

## 10. TDD in Practice — Example Workflow

Here's how TDD plays out for a concrete story: **"User can analyze a page with Quick Scan"**

**Step 1: Write failing tests (Red)**

```javascript
// tests/unit/prompt-engine.test.js
describe('Prompt Engine', () => {
  it('selects quick template when mode is quick', () => {
    const prompt = buildPrompt({ mode: 'quick', content: 'test content' });
    expect(prompt.template).toContain('Quick Summary');
  });

  it('injects page content into template', () => {
    const prompt = buildPrompt({
      mode: 'quick',
      content: 'Breaking news about climate change',
      title: 'Climate Report',
      url: 'https://example.com/article'
    });
    expect(prompt.text).toContain('Breaking news about climate change');
    expect(prompt.text).toContain('Climate Report');
  });
});

// tests/unit/response-parser.test.js
describe('Response Parser', () => {
  it('parses valid JSON response into AnalysisResult', () => {
    const raw = JSON.stringify({
      summary: 'Well-sourced article...',
      bs_score: { score: 22, justification: 'Mostly solid sourcing' },
      components: { evidence_weakness: { score: 2, reason: 'Clear citations' } },
      // ...
    });
    const result = parseResponse(raw);
    expect(result.bsScore).toBe(22);
    expect(result.components.evidenceWeakness.score).toBe(2);
  });
});
```

**Step 2: Implement minimum code (Green)**

Write just enough `buildPrompt()` and `parseResponse()` to make tests pass.

**Step 3: Refactor**

Clean up, extract constants, improve naming — tests stay green.

**Step 4: Next test**

Write the integration test that wires prompt engine + parser + API call together, then implement the glue.

---

## 11. Test Fixtures

### 11.1 Sample page content fixtures

Store extracted content from real URLs as `.json` files in `tests/fixtures/sample-pages/`:

```json
{
  "url": "https://www.reuters.com/example-article",
  "title": "Example Reuters Article",
  "contentType": "article",
  "content": "The extracted page text goes here...",
  "metadata": { "author": "Jane Doe", "publishDate": "2026-03-15" },
  "expectedBand": "low",
  "expectedScoreRange": [5, 25]
}
```

### 11.2 API response fixtures

Store mocked OpenRouter responses in `tests/fixtures/api-responses/`:

- `valid-quick-response.json` — well-formed JSON matching our schema
- `valid-standard-response.json` — deeper analysis with claims breakdown
- `malformed-json.json` — partially broken JSON
- `text-format-response.txt` — non-JSON response with extractable scores
- `empty-response.json` — empty string
- `error-429.json` — rate limit response
- `error-401.json` — invalid API key response

### 11.3 Expected results fixtures

Store expected parsed outputs in `tests/fixtures/expected-results/`:

Each fixture pairs with a sample page + API response and defines the expected `AnalysisResult` object, enabling deterministic assertion in tests.

---

## 12. Metrics & Reporting

| Metric | Tool | Target |
|--------|------|--------|
| Test pass rate | Vitest | 100% (CI blocks on failure) |
| Line coverage | c8/istanbul | 85%+ |
| Branch coverage | c8/istanbul | 75%+ |
| Test execution time | Vitest | < 30s for unit + integration |
| Flaky test count | Manual tracking | 0 (flaky tests are bugs) |
| URL battery drift | Manual review log | Score changes > 10 pts flagged |

---

## 13. Future Testing Enhancements (post-MVP)

- **Visual regression** — screenshot comparison for popup UI states (Playwright)
- **Load testing** — concurrent analysis requests, service worker behavior under pressure
- **Accessibility testing** — automated axe-core checks on popup and onboarding views
- **Prompt fuzzing** — inject adversarial page content to test prompt injection defenses
- **Cross-model scoring eval** — automated battery runs across providers with delta tracking
- **Property-based testing** — generate random score combinations to verify calculator edge cases
