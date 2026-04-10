#!/bin/bash
# =============================================================================
# BS Detector — Epic 0: Walking Skeleton — GitHub Issue Creator
# =============================================================================
# Prerequisites:
#   1. Install gh CLI: https://cli.github.com/
#   2. Authenticate: gh auth login
#   3. Run from the repo root: bash scripts/create-epic-0-issues.sh
# =============================================================================

REPO="rdavidescu/bs-detector"

echo "🔧 Creating labels..."
gh label create "epic" --color "6f42c1" --description "Epic-level issue" --repo $REPO 2>/dev/null
gh label create "walking-skeleton" --color "0e8a16" --description "Walking skeleton (Epic 0)" --repo $REPO 2>/dev/null
gh label create "story" --color "1d76db" --description "User story" --repo $REPO 2>/dev/null
gh label create "scaffolding" --color "bfd4f2" --description "Project setup and scaffolding" --repo $REPO 2>/dev/null
gh label create "content-extraction" --color "d4c5f9" --description "Content extraction from web pages" --repo $REPO 2>/dev/null
gh label create "config" --color "fef2c0" --description "Configuration and settings" --repo $REPO 2>/dev/null
gh label create "prompt-engine" --color "f9d0c4" --description "Prompt engine and templates" --repo $REPO 2>/dev/null
gh label create "openrouter" --color "ff9f1c" --description "OpenRouter provider integration" --repo $REPO 2>/dev/null
gh label create "provider" --color "e99695" --description "AI provider integration" --repo $REPO 2>/dev/null
gh label create "parser" --color "c5def5" --description "Response parsing" --repo $REPO 2>/dev/null
gh label create "scoring" --color "fbca04" --description "BS Score calculation" --repo $REPO 2>/dev/null
gh label create "orchestrator" --color "b60205" --description "Analysis pipeline orchestration" --repo $REPO 2>/dev/null
gh label create "integration" --color "5319e7" --description "Integration work" --repo $REPO 2>/dev/null
gh label create "ui" --color "0075ca" --description "User interface" --repo $REPO 2>/dev/null
gh label create "smoke-test" --color "2ea44f" --description "End-to-end smoke test" --repo $REPO 2>/dev/null
gh label create "qa" --color "008672" --description "Quality assurance" --repo $REPO 2>/dev/null
echo ""

# =============================================================================
echo "📋 Creating Epic 0..."
# =============================================================================
EPIC_URL=$(gh issue create \
  --repo $REPO \
  --title "[EPIC] Walking Skeleton — End-to-End Tracer Bullet" \
  --label "epic,walking-skeleton" \
  --body "$(cat <<'EPICEOF'
## Goal

Build the thinnest possible end-to-end chain that proves the full architecture works — from button click to BS Score on screen. Every layer touched once, mocks where appropriate, real OpenRouter API call at the center.

## The Chain

```
[Popup: Button] → [Background SW] → [Content Script: grab text]
    → [Prompt Engine: build prompt] → [OpenRouter: real API call]
    → [Response Parser: extract result] → [Popup: show raw result]
```

## Sprint Goal

> "A bit of nothing, but something to build over"

## Acceptance Criteria

- [ ] Extension loads in Chrome developer mode without errors
- [ ] Clicking "Analyze" on any web page triggers the full chain
- [ ] A real OpenRouter API call is made with extracted page content
- [ ] A BS Score (0–100) and summary appear in the popup
- [ ] All unit tests pass, all integration tests pass
- [ ] Test coverage ≥ 85% on new code

## What This Is NOT

- No onboarding UI, no settings, no history
- No fallback or retry logic
- No pretty UI — raw text output is fine
- No error handling beyond basic crash prevention
- No mode selection — Quick Scan only

## Stories

- [ ] WS-01: Project scaffolding + manifest
- [ ] WS-02: Content script — basic text extraction
- [ ] WS-03: Config-based API key
- [ ] WS-04: Prompt engine — minimal Quick Scan template
- [ ] WS-05: OpenRouter adapter — real API call
- [ ] WS-06: Response parser + score calculator
- [ ] WS-07: Background orchestrator — wire the chain
- [ ] WS-08: Popup — button + raw result display
- [ ] WS-09: Smoke test — end-to-end on a real page

## Dependency Graph

```
WS-01 (scaffolding)
  ├── WS-02 (content script)  ←── can run parallel with WS-03
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

## Estimation

~1 sprint for a solo developer, or 3–4 days for a pair.
EPICEOF
)")

echo "  ✅ Epic created: $EPIC_URL"
EPIC_NUM=$(echo $EPIC_URL | grep -o '[0-9]*$')
echo ""

# =============================================================================
echo "📝 Creating stories..."
# =============================================================================

# --- WS-01 ---
WS01_URL=$(gh issue create \
  --repo $REPO \
  --title "[WS-01] Set up project scaffolding, manifest.json, and test framework" \
  --label "walking-skeleton,scaffolding,story" \
  --body "$(cat <<'EOF'
**Epic:** Walking Skeleton (#EPIC_NUM)
**Depends on:** nothing (first story)
**Estimate:** S (small)

## Description

Create the project foundation. After this story, the extension loads in Chrome with an empty popup and a registered background service worker. Test framework is configured and a dummy test passes.

## Acceptance Criteria

- [ ] Directory structure matches architecture spec (background/, content/, providers/, prompts/, ui/, shared/, tests/)
- [ ] `manifest.json` is valid Manifest V3 with `activeTab`, `storage` permissions and `https://openrouter.ai/*` host permission
- [ ] Service worker registers without errors in `chrome://extensions`
- [ ] Empty popup opens when clicking extension icon
- [ ] `package.json` with Vitest, ESLint configured
- [ ] `vitest.config.js` in place with happy-dom environment
- [ ] `npm test` runs and a dummy test passes
- [ ] Chrome API mocks scaffolded in `tests/mocks/chrome-api.js`

## Tasks

- [ ] `npm init` + install vitest, eslint, msw, happy-dom
- [ ] Create directory structure per architecture
- [ ] Write `manifest.json` (MV3, service worker, content script, popup)
- [ ] Create empty `background/service-worker.js` that registers
- [ ] Create `ui/popup.html` with minimal HTML shell
- [ ] Create `vitest.config.js`
- [ ] Create `tests/mocks/chrome-api.js` with basic chrome.runtime, chrome.storage, chrome.tabs stubs
- [ ] Write one dummy test that imports a module and asserts it exists
- [ ] Verify extension loads in Chrome developer mode

## TDD Anchor

Write the dummy test first, verify it fails (module not found), then create the module.

## Files Touched

`manifest.json`, `package.json`, `vitest.config.js`, `background/service-worker.js`, `ui/popup.html`, `tests/mocks/chrome-api.js`
EOF
)")
echo "  ✅ WS-01: $WS01_URL"

# --- WS-02 ---
WS02_URL=$(gh issue create \
  --repo $REPO \
  --title "[WS-02] Content script extracts page text and sends to background" \
  --label "walking-skeleton,content-extraction,story" \
  --body "$(cat <<'EOF'
**Epic:** Walking Skeleton
**Depends on:** WS-01
**Estimate:** S (small)

## Description

The content script runs on the active page, grabs visible text, and sends it to the background service worker. No smart extraction — just `document.body.innerText` trimmed to the token budget. Metadata (title, URL) included.

## Acceptance Criteria

- [ ] Content script injects into the active tab when triggered
- [ ] Extracts `document.body.innerText`
- [ ] Trims content to 12,000 characters (3K token budget × 4 chars)
- [ ] Adds truncation marker if content was trimmed
- [ ] Sends message `{ type: "ANALYZE_REQUEST", payload: { title, url, content, contentType: "unknown" } }` to background
- [ ] Unit tests pass for extraction and trimming logic

## Tasks

- [ ] **TEST FIRST:** Write unit test — `extractContent()` returns object with title, url, content fields
- [ ] **TEST FIRST:** Write unit test — content over 12K chars is trimmed with marker
- [ ] **TEST FIRST:** Write unit test — content under 100 chars returns error signal
- [ ] Implement `content/content-script.js` with `extractContent()` function
- [ ] Implement `shared/content-trimmer.js` with trimming logic
- [ ] Add message sending via `chrome.runtime.sendMessage`
- [ ] Integration test: content script sends correctly shaped message (mocked Chrome API)

## TDD Anchor

Tests for `extractContent()` and trimmer are the first code written. Implementation follows.

## Files Touched

`content/content-script.js`, `shared/content-trimmer.js`, `tests/unit/content-extractor.test.js`, `tests/unit/content-trimmer.test.js`
EOF
)")
echo "  ✅ WS-02: $WS02_URL"

# --- WS-03 ---
WS03_URL=$(gh issue create \
  --repo $REPO \
  --title "[WS-03] API key loaded from local config file — no UI needed" \
  --label "walking-skeleton,config,story" \
  --body "$(cat <<'EOF'
**Epic:** Walking Skeleton
**Depends on:** WS-01
**Estimate:** XS (tiny)

## Description

For the walking skeleton, we skip onboarding UI entirely. The OpenRouter API key lives in a `config.js` file that the background worker imports. This file is `.gitignore`d (never committed). A `config.example.js` ships with placeholder instructions.

## Acceptance Criteria

- [ ] `config.js` exports `{ OPENROUTER_API_KEY: "sk-or-..." }`
- [ ] `config.example.js` ships with placeholder and setup instructions
- [ ] `.gitignore` includes `config.js`
- [ ] Background worker can import and read the key
- [ ] Unit test verifies config shape validation (key present, non-empty string)

## Tasks

- [ ] **TEST FIRST:** Write unit test — `loadConfig()` returns object with `OPENROUTER_API_KEY` string
- [ ] **TEST FIRST:** Write unit test — missing or empty key throws descriptive error
- [ ] Create `config.example.js` with instructions comment
- [ ] Create `shared/config.js` loader with validation
- [ ] Add `config.js` to `.gitignore`
- [ ] Verify background worker can access the key at runtime

## TDD Anchor

Config validation tests first. Then the loader.

## Files Touched

`config.example.js`, `shared/config.js`, `.gitignore`, `tests/unit/config.test.js`
EOF
)")
echo "  ✅ WS-03: $WS03_URL"

# --- WS-04 ---
WS04_URL=$(gh issue create \
  --repo $REPO \
  --title "[WS-04] Prompt engine assembles Quick Scan prompt from content" \
  --label "walking-skeleton,prompt-engine,story" \
  --body "$(cat <<'EOF'
**Epic:** Walking Skeleton
**Depends on:** WS-02
**Estimate:** M (medium)

## Description

Takes extracted content (title, URL, text, content type) and injects it into the Quick Scan prompt template. Returns the assembled prompt ready for the API call. Includes JSON mode instruction so OpenRouter returns structured output.

## Acceptance Criteria

- [ ] `buildPrompt({ mode, title, url, content, contentType })` returns assembled prompt object
- [ ] All `{{placeholder}}` variables replaced with actual values
- [ ] No unresolved `{{...}}` patterns in output
- [ ] JSON mode instruction included in system prompt
- [ ] Response schema appended to prompt (tells the model what JSON structure to return)
- [ ] Unit tests pass for template assembly

## Tasks

- [ ] **TEST FIRST:** Write unit test — `buildPrompt()` returns object with `system` and `user` message strings
- [ ] **TEST FIRST:** Write unit test — no unresolved `{{placeholders}}` in output
- [ ] **TEST FIRST:** Write unit test — JSON response schema is included in the prompt
- [ ] **TEST FIRST:** Write unit test — empty content input returns error
- [ ] Create `prompts/templates/quick.js` with the Quick Scan template (from `docs/bs_detector_quick_prompt.md`)
- [ ] Create `prompts/prompt-engine.js` with `buildPrompt()` function
- [ ] Include JSON schema instruction for structured response format

## TDD Anchor

All 4 unit tests written before any prompt engine code.

## Reference

See `docs/bs_detector_quick_prompt.md` for the full prompt template and scoring rules.

## Files Touched

`prompts/prompt-engine.js`, `prompts/templates/quick.js`, `tests/unit/prompt-engine.test.js`
EOF
)")
echo "  ✅ WS-04: $WS04_URL"

# --- WS-05 ---
WS05_URL=$(gh issue create \
  --repo $REPO \
  --title "[WS-05] OpenRouter adapter makes real API call and returns response" \
  --label "walking-skeleton,provider,openrouter,story" \
  --body "$(cat <<'EOF'
**Epic:** Walking Skeleton
**Depends on:** WS-03, WS-04
**Estimate:** M (medium)

## Description

The adapter takes an assembled prompt + API key and makes a real `fetch()` call to OpenRouter's chat completions endpoint. JSON mode enabled. Returns the raw response body. Unit tests use MSW mocks; the skeleton demo uses a real call.

## Acceptance Criteria

- [ ] `callOpenRouter({ prompt, apiKey })` makes a POST to `https://openrouter.ai/api/v1/chat/completions`
- [ ] Request includes correct Authorization header, HTTP-Referer, X-Title
- [ ] Request includes `response_format: { type: "json_object" }` for JSON mode
- [ ] Returns parsed response body on success
- [ ] Returns typed error object on failure (with HTTP status)
- [ ] Unit tests pass with MSW mocked responses (200, 401, 429, 500, timeout)

## Tasks

- [ ] **TEST FIRST:** Write unit test (MSW) — successful 200 → returns response body
- [ ] **TEST FIRST:** Write unit test (MSW) — 401 → returns `{ error: "invalid_key" }`
- [ ] **TEST FIRST:** Write unit test (MSW) — 429 → returns `{ error: "rate_limited" }`
- [ ] **TEST FIRST:** Write unit test (MSW) — 500 → returns `{ error: "provider_error" }`
- [ ] **TEST FIRST:** Write unit test (MSW) — timeout → returns `{ error: "timeout" }`
- [ ] Set up MSW handler for OpenRouter endpoint in `tests/mocks/openrouter-api.js`
- [ ] Create `providers/adapters/openrouter.js` with `callOpenRouter()` function
- [ ] Create `providers/provider-manager.js` with interface (routes to adapter)
- [ ] Manually verify a real API call works with a valid key (not automated)

## TDD Anchor

All 5 MSW-based tests written first. The real API verification is manual.

## Reference

OpenRouter API: `https://openrouter.ai/api/v1/chat/completions` (OpenAI-compatible format)
See plan Section 10.7 for full provider spec.

## Files Touched

`providers/adapters/openrouter.js`, `providers/provider-manager.js`, `tests/unit/openrouter-adapter.test.js`, `tests/mocks/openrouter-api.js`
EOF
)")
echo "  ✅ WS-05: $WS05_URL"

# --- WS-06 ---
WS06_URL=$(gh issue create \
  --repo $REPO \
  --title "[WS-06] Parse AI response JSON and calculate weighted BS Score" \
  --label "walking-skeleton,parser,scoring,story" \
  --body "$(cat <<'EOF'
**Epic:** Walking Skeleton
**Depends on:** WS-05
**Estimate:** M (medium)

## Description

Takes the raw JSON response from OpenRouter, extracts the 5 component scores, summary, claims, red flags, and confidence. Calculates the weighted BS Score. Handles malformed responses gracefully.

## Acceptance Criteria

- [ ] `parseResponse(raw)` returns canonical `AnalysisResult` object
- [ ] Valid JSON → all fields extracted correctly
- [ ] Partial JSON (missing fields) → defaults applied, no crash
- [ ] Malformed JSON → attempts text regex extraction as fallback
- [ ] Empty response → returns error result
- [ ] `calculateBSScore(components)` returns correct weighted score (0–100)
- [ ] Score rounded to nearest integer
- [ ] Unit tests pass for all parsing and calculation scenarios

## Tasks

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

## Scoring Formula

```
BS Score = (Evidence×3 + Context×2 + Certainty×2 + Emotion×1.5 + Source×1.5) / 10 × 10
```

Weights: Evidence 30%, Context 20%, Certainty 20%, Emotion 15%, Source 15%

## TDD Anchor

7 unit tests written before any parser code. This is the most test-dense story.

## Files Touched

`shared/response-parser.js`, `shared/score-calculator.js`, `tests/unit/response-parser.test.js`, `tests/unit/score-calculator.test.js`, `tests/fixtures/api-responses/*.json`
EOF
)")
echo "  ✅ WS-06: $WS06_URL"

# --- WS-07 ---
WS07_URL=$(gh issue create \
  --repo $REPO \
  --title "[WS-07] Background service worker orchestrates the full analysis chain" \
  --label "walking-skeleton,orchestrator,integration,story" \
  --body "$(cat <<'EOF'
**Epic:** Walking Skeleton
**Depends on:** WS-02, WS-04, WS-05, WS-06
**Estimate:** M (medium)

## Description

The background service worker listens for messages, orchestrates the chain: receives content from content script → builds prompt → calls OpenRouter → parses response → sends result to popup. This is the glue that connects all previous stories.

## Acceptance Criteria

- [ ] Service worker listens for `TRIGGER_ANALYSIS` from popup
- [ ] Sends `EXTRACT_CONTENT` to content script
- [ ] Receives `ANALYZE_REQUEST` with extracted content
- [ ] Calls `buildPrompt()` → `callOpenRouter()` → `parseResponse()` → `calculateBSScore()`
- [ ] Sends `ANALYSIS_RESULT` back to popup with final result
- [ ] Sends `ANALYSIS_STATE` updates (extracting → analyzing → complete)
- [ ] Integration tests pass with mocked Chrome APIs + MSW

## Tasks

- [ ] **TEST FIRST:** Write integration test — full chain with mocks → returns AnalysisResult
- [ ] **TEST FIRST:** Write integration test — state transitions emitted in correct order
- [ ] **TEST FIRST:** Write integration test — API failure → error state sent to popup
- [ ] Create `background/service-worker.js` message listener and router
- [ ] Create `background/analysis-pipeline.js` with orchestration logic
- [ ] Wire imports: prompt-engine, provider-manager, response-parser, score-calculator
- [ ] Define message types in `shared/message-types.js`
- [ ] Verify message flow works with mocked Chrome runtime

## TDD Anchor

Integration tests with full chain (mocked I/O) written first. Then the wiring code.

## Files Touched

`background/service-worker.js`, `background/analysis-pipeline.js`, `shared/message-types.js`, `tests/integration/analysis-pipeline.test.js`
EOF
)")
echo "  ✅ WS-07: $WS07_URL"

# --- WS-08 ---
WS08_URL=$(gh issue create \
  --repo $REPO \
  --title "[WS-08] Popup UI with Analyze button and raw result display" \
  --label "walking-skeleton,ui,story" \
  --body "$(cat <<'EOF'
**Epic:** Walking Skeleton
**Depends on:** WS-07
**Estimate:** S (small)

## Description

Minimal popup with one button and one results area. Click "Analyze" → triggers the chain → shows BS Score + summary as plain text. No styling, no components, no gauge — just proof that the result reaches the user's eyes.

## Acceptance Criteria

- [ ] Popup has an "Analyze" button
- [ ] Popup has a status text area (shows "Extracting...", "Analyzing...", etc.)
- [ ] Popup has a results area
- [ ] Clicking Analyze sends `TRIGGER_ANALYSIS` to background
- [ ] On `ANALYSIS_STATE` messages → status text updates
- [ ] On `ANALYSIS_RESULT` → displays BS Score, summary, component scores as plain text
- [ ] On error → displays error message
- [ ] Unit test: button click sends correct message
- [ ] Unit test: result received → rendered in DOM

## Tasks

- [ ] **TEST FIRST:** Write unit test — clicking Analyze sends `TRIGGER_ANALYSIS` message
- [ ] **TEST FIRST:** Write unit test — receiving `ANALYSIS_RESULT` renders score in DOM
- [ ] **TEST FIRST:** Write unit test — receiving `ANALYSIS_STATE` updates status text
- [ ] Create `ui/popup.html` — button, status div, results div (minimal HTML)
- [ ] Create `ui/popup.js` — event listeners, message handling, DOM rendering
- [ ] Create `ui/popup.css` — bare minimum (readable text, nothing fancy)
- [ ] Manual test: open popup, click button, see result

## TDD Anchor

DOM interaction tests (happy-dom) first. Then the HTML/JS.

## Files Touched

`ui/popup.html`, `ui/popup.js`, `ui/popup.css`, `tests/unit/popup.test.js`
EOF
)")
echo "  ✅ WS-08: $WS08_URL"

# --- WS-09 ---
WS09_URL=$(gh issue create \
  --repo $REPO \
  --title "[WS-09] End-to-end smoke test — analyze a real web page" \
  --label "walking-skeleton,smoke-test,qa,story" \
  --body "$(cat <<'EOF'
**Epic:** Walking Skeleton
**Depends on:** WS-08 (all previous stories complete)
**Estimate:** XS (tiny)

## Description

The victory lap. Load the extension in Chrome dev mode, navigate to a known URL from the test battery, click Analyze, and verify a real BS Score appears. Document the result. This story has no code deliverable — it's the verification that the skeleton stands.

## Acceptance Criteria

- [ ] Extension loaded in Chrome developer mode without errors
- [ ] Navigate to a test URL (e.g., a Reuters article)
- [ ] Click Analyze in popup
- [ ] Real API call to OpenRouter succeeds
- [ ] BS Score + summary displayed in popup
- [ ] Score is in a reasonable range for the content (e.g., quality journalism → 0–30)
- [ ] Screenshot captured as proof
- [ ] Result documented in `tests/manual/skeleton-smoke-test.md`

## Tasks

- [ ] Load extension in `chrome://extensions` (developer mode, load unpacked)
- [ ] Verify no console errors in service worker
- [ ] Navigate to Reuters/AP News article
- [ ] Click Analyze → observe full chain executing
- [ ] Verify BS Score appears with summary
- [ ] Navigate to a clickbait article → verify higher score
- [ ] Capture screenshots of both results
- [ ] Document results in `tests/manual/skeleton-smoke-test.md` (URL, score, screenshot)
- [ ] File any bugs discovered as separate issues

## TDD Anchor

This is the manual test that validates the entire skeleton. No code, just proof.

## Files Touched

`tests/manual/skeleton-smoke-test.md` (new — results documentation)
EOF
)")
echo "  ✅ WS-09: $WS09_URL"

echo ""
echo "============================================="
echo "🎉 Done! Epic 0 created with 9 stories."
echo "============================================="
echo ""
echo "Epic:  $EPIC_URL"
echo "WS-01: $WS01_URL"
echo "WS-02: $WS02_URL"
echo "WS-03: $WS03_URL"
echo "WS-04: $WS04_URL"
echo "WS-05: $WS05_URL"
echo "WS-06: $WS06_URL"
echo "WS-07: $WS07_URL"
echo "WS-08: $WS08_URL"
echo "WS-09: $WS09_URL"
echo ""
echo "Next: Open the Epic issue and update story references with actual issue numbers."
