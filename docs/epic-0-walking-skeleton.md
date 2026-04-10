# Epic 0: Walking Skeleton

> **Goal:** Build the thinnest possible end-to-end chain that proves the full architecture works — from button click to BS Score on screen. Every layer touched once, mocks where appropriate, real OpenRouter API call at the center.

**Labels:** `epic`, `walking-skeleton`, `mvp`  
**Milestone:** Walking Skeleton  
**Sprint Goal:** "A bit of nothing, but something to build over"

---

## Epic Issue

### [EPIC] Walking Skeleton — End-to-End Tracer Bullet

**Description:**

Deliver the smallest working version of BS Detector that completes the full analysis chain:

```
[Popup: Button] → [Background SW] → [Content Script: grab text]
    → [Prompt Engine: build prompt] → [OpenRouter: real API call]
    → [Response Parser: extract result] → [Popup: show raw result]
```

**Acceptance Criteria:**
- [ ] Extension loads in Chrome developer mode without errors
- [ ] Clicking "Analyze" on any web page triggers the full chain
- [ ] A real OpenRouter API call is made with extracted page content
- [ ] A BS Score (0–100) and summary appear in the popup
- [ ] All unit tests pass, all integration tests pass
- [ ] Test coverage ≥ 85% on new code

**What this is NOT:**
- No onboarding UI, no settings, no history
- No fallback or retry logic
- No pretty UI — raw text output is fine
- No error handling beyond basic crash prevention
- No mode selection — Quick Scan only

**Stories (in suggested implementation order):**
1. Project scaffolding + manifest
2. Content script — basic text extraction
3. Config-based API key
4. Prompt engine — minimal Quick Scan template
5. OpenRouter adapter — real API call
6. Response parser + score calculator
7. Background orchestrator — wire the chain
8. Popup — button + raw result display
9. Smoke test — end-to-end on a real page

---

## Story 0.1 — Project Scaffolding + Manifest

**Title:** `[WS-01] Set up project scaffolding, manifest.json, and test framework`

**Labels:** `walking-skeleton`, `scaffolding`, `story`  
**Depends on:** nothing (first story)

**Description:**

Create the project foundation. After this story, the extension loads in Chrome with an empty popup and a registered background service worker. Test framework is configured and a dummy test passes.

**Acceptance Criteria:**
- [ ] Directory structure matches architecture spec (background/, content/, providers/, prompts/, ui/, shared/, tests/)
- [ ] `manifest.json` is valid Manifest V3 with `activeTab`, `storage` permissions and `https://openrouter.ai/*` host permission
- [ ] Service worker registers without errors in `chrome://extensions`
- [ ] Empty popup opens when clicking extension icon
- [ ] `package.json` with Vitest, ESLint configured
- [ ] `vitest.config.js` in place with happy-dom environment
- [ ] `npm test` runs and a dummy test passes
- [ ] Chrome API mocks scaffolded in `tests/mocks/chrome-api.js`

**Tasks:**
- [ ] `npm init` + install vitest, eslint, msw, happy-dom
- [ ] Create directory structure per architecture
- [ ] Write `manifest.json` (MV3, service worker, content script, popup)
- [ ] Create empty `background/service-worker.js` that registers
- [ ] Create `ui/popup.html` with minimal HTML shell
- [ ] Create `vitest.config.js`
- [ ] Create `tests/mocks/chrome-api.js` with basic chrome.runtime, chrome.storage, chrome.tabs stubs
- [ ] Write one dummy test that imports a module and asserts it exists
- [ ] Verify extension loads in Chrome developer mode

**TDD anchor:** Write the dummy test first, verify it fails (module not found), then create the module.

---

## Story 0.2 — Content Script: Basic Text Extraction

**Title:** `[WS-02] Content script extracts page text and sends to background`

**Labels:** `walking-skeleton`, `content-extraction`, `story`  
**Depends on:** WS-01

**Description:**

The content script runs on the active page, grabs visible text, and sends it to the background service worker. No smart extraction — just `document.body.innerText` trimmed to the token budget. Metadata (title, URL) included.

**Acceptance Criteria:**
- [ ] Content script injects into the active tab when triggered
- [ ] Extracts `document.body.innerText`
- [ ] Trims content to 12,000 characters (3K token budget × 4 chars)
- [ ] Adds truncation marker if content was trimmed
- [ ] Sends message `{ type: "ANALYZE_REQUEST", payload: { title, url, content, contentType: "unknown" } }` to background
- [ ] Unit tests pass for extraction and trimming logic

**Tasks:**
- [ ] **TEST FIRST:** Write unit test — `extractContent()` returns object with title, url, content fields
- [ ] **TEST FIRST:** Write unit test — content over 12K chars is trimmed with marker
- [ ] **TEST FIRST:** Write unit test — content under 100 chars returns error signal
- [ ] Implement `content/content-script.js` with `extractContent()` function
- [ ] Implement `shared/content-trimmer.js` with trimming logic
- [ ] Add message sending via `chrome.runtime.sendMessage`
- [ ] Integration test: content script sends correctly shaped message (mocked Chrome API)

**TDD anchor:** Tests for `extractContent()` and trimmer are the first code written. Implementation follows.

---

## Story 0.3 — Config-Based API Key

**Title:** `[WS-03] API key loaded from local config file — no UI needed`

**Labels:** `walking-skeleton`, `config`, `story`  
**Depends on:** WS-01

**Description:**

For the walking skeleton, we skip onboarding UI entirely. The OpenRouter API key lives in a `config.js` file that the background worker imports. This file is `.gitignore`d (never committed). A `config.example.js` ships with placeholder instructions.

**Acceptance Criteria:**
- [ ] `config.js` exports `{ OPENROUTER_API_KEY: "sk-or-..." }`
- [ ] `config.example.js` ships with placeholder and setup instructions
- [ ] `.gitignore` includes `config.js`
- [ ] Background worker can import and read the key
- [ ] Unit test verifies config shape validation (key present, non-empty string)

**Tasks:**
- [ ] **TEST FIRST:** Write unit test — `loadConfig()` returns object with `OPENROUTER_API_KEY` string
- [ ] **TEST FIRST:** Write unit test — missing or empty key throws descriptive error
- [ ] Create `config.example.js` with instructions comment
- [ ] Create `shared/config.js` loader with validation
- [ ] Add `config.js` to `.gitignore`
- [ ] Verify background worker can access the key at runtime

**TDD anchor:** Config validation tests first. Then the loader.

---

## Story 0.4 — Minimal Prompt Engine

**Title:** `[WS-04] Prompt engine assembles Quick Scan prompt from content`

**Labels:** `walking-skeleton`, `prompt-engine`, `story`  
**Depends on:** WS-02

**Description:**

Takes extracted content (title, URL, text, content type) and injects it into the Quick Scan prompt template. Returns the assembled prompt ready for the API call. Includes JSON mode instruction so OpenRouter returns structured output.

**Acceptance Criteria:**
- [ ] `buildPrompt({ mode, title, url, content, contentType })` returns assembled prompt object
- [ ] All `{{placeholder}}` variables replaced with actual values
- [ ] No unresolved `{{...}}` patterns in output
- [ ] JSON mode instruction included in system prompt
- [ ] Response schema appended to prompt (tells the model what JSON structure to return)
- [ ] Unit tests pass for template assembly

**Tasks:**
- [ ] **TEST FIRST:** Write unit test — `buildPrompt()` returns object with `system` and `user` message strings
- [ ] **TEST FIRST:** Write unit test — no unresolved `{{placeholders}}` in output
- [ ] **TEST FIRST:** Write unit test — JSON response schema is included in the prompt
- [ ] **TEST FIRST:** Write unit test — empty content input returns error
- [ ] Create `prompts/templates/quick.js` with the Quick Scan template (from `docs/bs_detector_quick_prompt.md`)
- [ ] Create `prompts/prompt-engine.js` with `buildPrompt()` function
- [ ] Include JSON schema instruction for structured response format

**TDD anchor:** All 4 unit tests written before any prompt engine code.

---

## Story 0.5 — OpenRouter Adapter: Real API Call

**Title:** `[WS-05] OpenRouter adapter makes real API call and returns response`

**Labels:** `walking-skeleton`, `provider`, `openrouter`, `story`  
**Depends on:** WS-03, WS-04

**Description:**

The adapter takes an assembled prompt + API key and makes a real `fetch()` call to OpenRouter's chat completions endpoint. JSON mode enabled. Returns the raw response body. Unit tests use MSW mocks; the skeleton demo uses a real call.

**Acceptance Criteria:**
- [ ] `callOpenRouter({ prompt, apiKey })` makes a POST to `https://openrouter.ai/api/v1/chat/completions`
- [ ] Request includes correct Authorization header, HTTP-Referer, X-Title
- [ ] Request includes `response_format: { type: "json_object" }` for JSON mode
- [ ] Returns parsed response body on success
- [ ] Returns typed error object on failure (with HTTP status)
- [ ] Unit tests pass with MSW mocked responses (200, 401, 429, 500)

**Tasks:**
- [ ] **TEST FIRST:** Write unit test (MSW) — successful 200 → returns response body
- [ ] **TEST FIRST:** Write unit test (MSW) — 401 → returns `{ error: "invalid_key" }`
- [ ] **TEST FIRST:** Write unit test (MSW) — 429 → returns `{ error: "rate_limited" }`
- [ ] **TEST FIRST:** Write unit test (MSW) — 500 → returns `{ error: "provider_error" }`
- [ ] **TEST FIRST:** Write unit test (MSW) — timeout → returns `{ error: "timeout" }`
- [ ] Set up MSW handler for OpenRouter endpoint in `tests/mocks/openrouter-api.js`
- [ ] Create `providers/adapters/openrouter.js` with `callOpenRouter()` function
- [ ] Create `providers/provider-manager.js` with interface (routes to adapter)
- [ ] Manually verify a real API call works with a valid key (not automated)

**TDD anchor:** All 5 MSW-based tests written first. The real API verification is manual.

---

## Story 0.6 — Response Parser + Score Calculator

**Title:** `[WS-06] Parse AI response JSON and calculate weighted BS Score`

**Labels:** `walking-skeleton`, `parser`, `scoring`, `story`  
**Depends on:** WS-05

**Description:**

Takes the raw JSON response from OpenRouter, extracts the 5 component scores, summary, claims, red flags, and confidence. Calculates the weighted BS Score. Handles malformed responses gracefully.

**Acceptance Criteria:**
- [ ] `parseResponse(raw)` returns canonical `AnalysisResult` object
- [ ] Valid JSON → all fields extracted correctly
- [ ] Partial JSON (missing fields) → defaults applied, no crash
- [ ] Malformed JSON → attempts text regex extraction as fallback
- [ ] Empty response → returns error result
- [ ] `calculateBSScore(components)` returns correct weighted score (0–100)
- [ ] Score rounded to nearest integer
- [ ] Unit tests pass for all parsing and calculation scenarios

**Tasks:**
- [ ] **TEST FIRST:** Write unit test — valid JSON fixture → correct AnalysisResult
- [ ] **TEST FIRST:** Write unit test — partial JSON (missing red_flags) → result with empty array, no crash
- [ ] **TEST FIRST:** Write unit test — malformed JSON → text regex extracts what it can
- [ ] **TEST FIRST:** Write unit test — empty string → error result
- [ ] **TEST FIRST:** Write unit test — `calculateBSScore({2,3,4,5,6})` → exact expected score
- [ ] **TEST FIRST:** Write unit test — all zeros → 0, all tens → 100
- [ ] **TEST FIRST:** Write unit test — score band classification (22 → "mild")
- [ ] Create test fixtures: `tests/fixtures/api-responses/valid-quick-response.json`
- [ ] Create test fixtures: `tests/fixtures/api-responses/malformed-response.json`
- [ ] Create test fixtures: `tests/fixtures/api-responses/empty-response.json`
- [ ] Create `shared/response-parser.js` with `parseResponse()`
- [ ] Create `shared/score-calculator.js` with `calculateBSScore()` and `getScoreBand()`

**TDD anchor:** 7 unit tests written before any parser code. This is the most test-dense story.

---

## Story 0.7 — Background Orchestrator: Wire the Chain

**Title:** `[WS-07] Background service worker orchestrates the full analysis chain`

**Labels:** `walking-skeleton`, `orchestrator`, `integration`, `story`  
**Depends on:** WS-02, WS-04, WS-05, WS-06

**Description:**

The background service worker listens for messages, orchestrates the chain: receives content from content script → builds prompt → calls OpenRouter → parses response → sends result to popup. This is the glue that connects all previous stories.

**Acceptance Criteria:**
- [ ] Service worker listens for `TRIGGER_ANALYSIS` from popup
- [ ] Sends `EXTRACT_CONTENT` to content script
- [ ] Receives `ANALYZE_REQUEST` with extracted content
- [ ] Calls `buildPrompt()` → `callOpenRouter()` → `parseResponse()` → `calculateBSScore()`
- [ ] Sends `ANALYSIS_RESULT` back to popup with final result
- [ ] Sends `ANALYSIS_STATE` updates (extracting → analyzing → complete)
- [ ] Integration tests pass with mocked Chrome APIs + MSW

**Tasks:**
- [ ] **TEST FIRST:** Write integration test — full chain with mocks → returns AnalysisResult
- [ ] **TEST FIRST:** Write integration test — state transitions emitted in correct order
- [ ] **TEST FIRST:** Write integration test — API failure → error state sent to popup
- [ ] Create `background/service-worker.js` message listener and router
- [ ] Create `background/analysis-pipeline.js` with orchestration logic
- [ ] Wire imports: prompt-engine, provider-manager, response-parser, score-calculator
- [ ] Define message types in `shared/message-types.js`
- [ ] Verify message flow works with mocked Chrome runtime

**TDD anchor:** Integration tests with full chain (mocked I/O) written first. Then the wiring code.

---

## Story 0.8 — Popup: Button + Raw Result Display

**Title:** `[WS-08] Popup UI with Analyze button and raw result display`

**Labels:** `walking-skeleton`, `ui`, `story`  
**Depends on:** WS-07

**Description:**

Minimal popup with one button and one results area. Click "Analyze" → triggers the chain → shows BS Score + summary as plain text. No styling, no components, no gauge — just proof that the result reaches the user's eyes.

**Acceptance Criteria:**
- [ ] Popup has an "Analyze" button
- [ ] Popup has a status text area (shows "Extracting...", "Analyzing...", etc.)
- [ ] Popup has a results area
- [ ] Clicking Analyze sends `TRIGGER_ANALYSIS` to background
- [ ] On `ANALYSIS_STATE` messages → status text updates
- [ ] On `ANALYSIS_RESULT` → displays BS Score, summary, component scores as plain text
- [ ] On error → displays error message
- [ ] Unit test: button click sends correct message
- [ ] Unit test: result received → rendered in DOM

**Tasks:**
- [ ] **TEST FIRST:** Write unit test — clicking Analyze sends `TRIGGER_ANALYSIS` message
- [ ] **TEST FIRST:** Write unit test — receiving `ANALYSIS_RESULT` renders score in DOM
- [ ] **TEST FIRST:** Write unit test — receiving `ANALYSIS_STATE` updates status text
- [ ] Create `ui/popup.html` — button, status div, results div (minimal HTML)
- [ ] Create `ui/popup.js` — event listeners, message handling, DOM rendering
- [ ] Create `ui/popup.css` — bare minimum (readable text, nothing fancy)
- [ ] Manual test: open popup, click button, see result

**TDD anchor:** DOM interaction tests (happy-dom) first. Then the HTML/JS.

---

## Story 0.9 — Smoke Test: End-to-End on a Real Page

**Title:** `[WS-09] End-to-end smoke test — analyze a real web page`

**Labels:** `walking-skeleton`, `smoke-test`, `qa`, `story`  
**Depends on:** WS-08 (all previous stories complete)

**Description:**

The victory lap. Load the extension in Chrome dev mode, navigate to a known URL from the test battery, click Analyze, and verify a real BS Score appears. Document the result. This story has no code deliverable — it's the verification that the skeleton stands.

**Acceptance Criteria:**
- [ ] Extension loaded in Chrome developer mode without errors
- [ ] Navigate to a test URL (e.g., a Reuters article)
- [ ] Click Analyze in popup
- [ ] Real API call to OpenRouter succeeds
- [ ] BS Score + summary displayed in popup
- [ ] Score is in a reasonable range for the content (e.g., quality journalism → 0–30)
- [ ] Screenshot captured as proof
- [ ] Result documented in `tests/manual/skeleton-smoke-test.md`

**Tasks:**
- [ ] Load extension in `chrome://extensions` (developer mode, load unpacked)
- [ ] Verify no console errors in service worker
- [ ] Navigate to Reuters/AP News article
- [ ] Click Analyze → observe full chain executing
- [ ] Verify BS Score appears with summary
- [ ] Navigate to a clickbait article → verify higher score
- [ ] Capture screenshots of both results
- [ ] Document results in `tests/manual/skeleton-smoke-test.md` (URL, score, screenshot)
- [ ] File any bugs discovered as separate issues

**TDD anchor:** This is the manual test that validates the entire skeleton. No code, just proof.

---

## Story Dependency Graph

```
WS-01 (scaffolding)
  ├── WS-02 (content script)
  │     └── WS-04 (prompt engine) ──┐
  ├── WS-03 (config/key)            │
  │     └── WS-05 (OpenRouter) ─────┤
  │           └── WS-06 (parser) ───┤
  │                                  │
  │     ┌────────────────────────────┘
  │     ▼
  └── WS-07 (orchestrator)
        └── WS-08 (popup UI)
              └── WS-09 (smoke test)
```

**Critical path:** WS-01 → WS-02 → WS-04 → WS-05 → WS-06 → WS-07 → WS-08 → WS-09

**Parallel opportunities:**
- WS-02 and WS-03 can run in parallel (both depend only on WS-01)
- WS-04 depends on WS-02, WS-05 depends on WS-03 — so these two tracks merge at WS-07

---

## Sprint Estimation (rough)

| Story | Estimated Effort | Notes |
|-------|-----------------|-------|
| WS-01 | S (small) | Scaffolding, mostly setup |
| WS-02 | S | Simple extraction, few tests |
| WS-03 | XS (tiny) | One file + validation |
| WS-04 | M (medium) | Template + injection + tests |
| WS-05 | M | API integration, MSW setup, 5 test cases |
| WS-06 | M | Parser is test-dense (7 tests), but logic is straightforward |
| WS-07 | M | Integration glue, most complex wiring |
| WS-08 | S | Minimal HTML/JS, bare UI |
| WS-09 | XS | Manual test, documentation only |

**Total estimate:** Roughly 1 sprint for a solo developer, or 3–4 days for a pair.
