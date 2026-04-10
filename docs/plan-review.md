# BS Detector — Plan Review & Consistency Audit

**Date:** 2026-04-10  
**Scope:** Deep evaluation of `bs_detector_chrome_extension_plan.md` against architecture, prompts, and project-drive  
**Goal:** Identify gaps, contradictions, and missing details to enable clean issue generation

---

## A. Internal Consistency Issues (within the plan itself)

### A1. Scoring dimensions: 6 in plan vs 5 in prompts

**Plan Section 9** lists 6 scoring factors:
> source integrity, context preservation, evidence strength, certainty inflation, emotional manipulation, cherry-picking

**Both prompts** (quick + standard) use 5 dimensions:
> Evidence Weakness, Context Loss, Certainty Inflation, Emotional Pressure, Source Transparency

The plan's "cherry-picking" got absorbed into Context Loss. The plan's "source integrity" became Source Transparency. "Evidence strength" became Evidence Weakness (inverted scale). These are reasonable consolidations — but the plan still says 6 while everything else says 5.

**Proposed change:** Update plan Section 9 to explicitly list the 5 canonical dimensions with their weights. Remove the 6-item list or mark it as the original brainstorm that evolved into the final 5.

---

### A2. Plan outputs don't match prompt outputs

**Plan Section 9** says the outputs are:
> credibility risk, manipulation score, confidence level

**Prompts** actually output:
> General BS Score, Component Scores (5 dimensions), Main Claims, Red Flags, Confidence, Suggested Action

"Manipulation score" doesn't exist as a standalone output anywhere. "Credibility risk" maps loosely to BS Score but the naming is inconsistent.

**Proposed change:** Update plan Section 9 outputs to match the actual prompt output structure. Adopt the prompt's vocabulary as canonical.

---

### A3. MVP scope vs roadmap phasing is ambiguous

**Plan Section 11 (MVP)** says:
> Must have: OpenRouter + one additional provider (Gemini recommended) + Quick + Standard + fallback + onboarding

**Plan Section 12 (Roadmap)** says:
> Phase 1: extension + OpenRouter  
> Phase 2: Gemini + fallback logic

So MVP = Phase 1 + Phase 2 combined? Or is Phase 1 a pre-MVP milestone? This matters a lot for issue scoping.

**Proposed change:** Decide if the roadmap phases are internal dev milestones within the MVP, or if Phase 1 is "alpha" and Phase 2 completes "MVP." My recommendation: treat Phases 1–2 as the MVP build sequence. Phase 1 is the walking skeleton (one provider, one mode, works end-to-end). Phase 2 adds the second provider and fallback. MVP is "done" after Phase 2. Make this explicit.

---

### A4. Fallback logic inconsistencies

**Plan Section 5.1** describes model fallback as: retry → next provider → downgrade depth.

**Plan Section 5.2** introduces a "quality fallback" concept:
> If output is weak: re-run with stricter prompt, switch to more capable model

But nowhere — not in the prompts, not in the architecture — is a "stricter prompt" variant defined. What makes a prompt "stricter"? Is there a `quick-strict.js` template? And "switch to more capable model" conflicts with "free-first" if the user hasn't configured paid models.

**Plan Section 5.3** introduces a third fallback layer:
> show partial extraction, offer manual copy-paste prompt

Three fallback layers is good design thinking, but they need clearer sequencing and definitions.

**Proposed change:**
1. Drop "quality fallback" from MVP. It's speculative and undefined. The anti-drift mechanism in the Standard prompt already does some of this work.
2. Define a single, clear fallback sequence for MVP: retry same provider (1x) → next provider → downgrade mode (Standard→Quick) → show partial + copy-paste fallback.
3. Move "quality re-run with stricter prompt" to a post-MVP enhancement with a proper spec.

---

### A5. CORS section is misleading

**Plan Section 4.4** says:
> direct browser calls where allowed, fallback to lightweight proxy (optional future)

In Manifest V3, `fetch()` from the background service worker **bypasses CORS entirely** as long as `host_permissions` are declared. This is a non-issue for the architecture as designed. The plan makes it sound like a potential problem that needs a proxy fallback.

**Proposed change:** Replace the CORS section with a clear statement: "API calls are made from the background service worker, which bypasses CORS restrictions. No proxy needed. Host permissions for each provider API must be declared in manifest.json."

---

### A6. "No censorship" principle needs sharper language

**Project-drive** says:
> We do not block, hide, or label content as "true" or "false"

But the extension literally outputs a BS Score from 0–100 with bands like "very high BS risk" and "red flags." That IS a form of labeling. The distinction is important but not articulated well enough.

**Proposed change:** Rewrite the principle to be more precise: "We do not declare content true or false. We surface patterns — weak evidence, emotional manipulation, missing context — and let the user decide. Scores are estimates of risk signals, not truth verdicts. The user always sees the reasoning behind the score."

This is consistent with the project-drive's "transparency over authority" and "uncertainty is a feature" principles, but the "no labeling" claim needs this nuance or it reads as contradictory.

---

## B. Missing Implementation Details (blocks for issue generation)

### B1. Response parsing specification

The prompts ask the AI to return a specific text structure (not JSON). But there's no spec for:
- How to parse that text structure reliably in code
- What to do when the AI adds extra text, changes formatting, or skips sections
- Whether to use JSON mode (supported by OpenRouter and Groq) vs free-text parsing
- Regex patterns or parsing rules for extracting scores from text

**Why this blocks issues:** You can't write a "build response parser" issue without defining what format it expects and how strict it should be.

**Recommendation:** Define two strategies:
1. **Preferred (MVP):** Use JSON mode where the provider supports it. Define a JSON schema for the expected output. Adapters that support `response_format: { type: "json_object" }` should use it.
2. **Fallback:** For providers without JSON mode, use regex-based parsing with clearly defined patterns for each output section.

Create a `response-schema.json` that defines the canonical output format.

---

### B2. Token counting / content trimming

The Prompt Engine needs to trim page content to fit provider context windows. But:
- Different models use different tokenizers (BPE variants)
- Client-side token counting without a library is inaccurate
- The plan doesn't specify any approach

**Recommendation:** Use a simple character-based estimate for MVP (1 token ≈ 4 chars for English text). Add a safety margin (use only 60% of max context for content, reserve the rest for prompt template + response). Accurate tokenization is a post-MVP enhancement. Document the estimation approach so issues can reference it.

---

### B3. Content type detection

The prompts have a `{{content_type}}` variable but nothing defines:
- What the valid values are (article? social_post? video? forum? product_page?)
- How the content script detects the type
- Whether it matters for analysis quality

**Recommendation:** Define an enum of content types and simple detection heuristics:
- `article` — has `<article>` tag or long-form text with paragraphs
- `social_post` — URLs matching twitter.com, facebook.com, reddit.com, etc.
- `video_page` — youtube.com, vimeo.com, or page with `<video>` element
- `forum` — URL patterns or thread-like DOM structure
- `unknown` — default fallback

Keep it simple for MVP. The AI model can work with "unknown" just fine.

---

### B4. Error states and loading UX

No document defines what the user sees during:
- Analysis in progress (loading state)
- Provider timeout
- API key invalid
- Rate limit hit
- All providers failed
- Partial results available

**Recommendation:** Define a state machine for the popup UI:
- `idle` → user hasn't triggered analysis
- `extracting` → content script is pulling page content
- `analyzing` → API call in progress (show provider name + spinner)
- `complete` → results ready
- `error` → failed with specific error type and user-facing message
- `partial` → some data available but analysis incomplete

Each state needs a UI treatment. This is a prerequisite for any UI-related issue.

---

### B5. Settings defaults for fresh install

No document defines what a brand-new install looks like:
- Which provider is selected by default? (OpenRouter free seems implied but not stated)
- Which analysis mode is default? (Quick seems logical for free tier)
- Does onboarding block first use, or can the user skip it?
- What if user skips onboarding and has no keys configured?

**Recommendation:** Define explicit defaults:
- Default provider: OpenRouter (free router, no key needed for some models — verify this)
- Default mode: Quick Scan
- Onboarding: shown on first click of Analyze, can be skipped
- No keys configured: attempt OpenRouter free; if it requires a key, prompt setup

---

### B6. Content size limits

The prompts mention trimming but don't specify:
- Max character/token count for content injection
- What trimming strategy to use (truncate from end? summarize? extract key paragraphs?)
- Different limits per provider/model

**Recommendation:** Set a default content budget of 3,000 tokens (~12,000 chars). Trimming strategy for MVP: truncate from the end with a "[content truncated]" marker. Smarter extraction (priority paragraphs, lead + conclusion) is a post-MVP enhancement. Per-provider overrides stored in provider config.

---

### B7. Provider API specifics

The plan says "unified request format" and "provider adapters" but doesn't document what each provider's API actually looks like. For issue generation, devs need to know:

| Provider | API Format | Auth Method | Free Tier Details | JSON Mode |
|----------|-----------|-------------|-------------------|-----------|
| OpenRouter | OpenAI-compatible | Bearer token | Free router available, rate limits vary | Yes |
| Google Gemini | Google AI REST API | API key in URL param | Free tier with generous limits | Yes (via response schema) |
| Groq | OpenAI-compatible | Bearer token | Free tier, fast inference | Yes |
| Hugging Face | HF Inference API | Bearer token | Free tier, model-dependent | No |

**Recommendation:** Create a `provider-specs.md` reference document with endpoint URLs, auth methods, request/response examples, rate limits, and free tier details for each provider. This becomes the spec that adapter issues reference.

---

### B8. Test strategy is completely absent

No document mentions testing at any level. For issue generation you need to know:
- What gets unit tested (prompt engine, adapters, response parser, score calculator)
- What gets integration tested (end-to-end with mock APIs)
- What gets manual tested (actual web pages with real providers)
- What test framework to use
- Are there test fixtures (sample pages, expected outputs)?

**Recommendation:** Define at minimum:
- Unit tests for: response parser, score calculation, content extraction logic, fallback sequencing
- Integration tests with mock API responses for each provider adapter
- Manual test suite: 5-10 reference URLs across content types (news article, opinion piece, scientific paper, social media post, product page) with expected score ranges
- Framework: Vitest (lightweight, fast, good for vanilla JS)

---

## C. Cross-Document Alignment Issues

### C1. Plan scoring ≠ Prompt scoring (already covered in A1 and A2)

The plan needs to adopt the prompt vocabulary as the source of truth for scoring.

---

### C2. Architecture assumes popup-only UI, plan hints at more

The plan says "lightweight UX" and the architecture designs only a popup. But Chrome extensions have several UI surfaces that should be considered:

- **Popup** (current design) — small window, disappears when clicked away
- **Side Panel** — persistent panel alongside browsing (better for reading results while looking at the page)
- **Badge** — small text/color on the extension icon (great for quick status)
- **Content overlay** — injected UI on the page itself

For MVP, popup is fine. But the architecture should note that the results rendering component should be decoupled from the popup container, so it can be reused in a side panel later.

**Recommendation:** Add a note in the architecture that the results view is a self-contained component (not tightly coupled to popup.html) to enable future side panel or overlay rendering.

---

### C3. Prompt files live at root, architecture expects them in prompts/templates/

Current state: `bs_detector_quick_prompt.md` and `bs_detector_standard_prompt.md` sit at the project root.

Architecture proposes: `prompts/templates/quick.js` and `prompts/templates/standard.js`

The current markdown files contain both the actual prompt text AND design notes, calibration guides, known limitations, etc. The JS files in the architecture would contain only the prompt template string and config.

**Recommendation:** Keep the markdown files as documentation (move them to `docs/`). Create the JS template files separately for the actual code. The markdown docs are the "spec," the JS files are the "implementation." Reference this split in the issue descriptions.

---

### C4. "Quality fallback" exists only in the plan

Plan Section 5.2 describes re-running with a "stricter prompt" or switching to a "more capable model." This concept doesn't exist in:
- The architecture (fallback controller only handles provider/mode fallback)
- The prompts (no "strict" variant exists)
- The project drive

**Recommendation:** Either spec it out properly or explicitly defer it. I'd defer it — it adds complexity without clear value at MVP. The anti-drift check in the Standard prompt already handles some quality assurance. A "quality re-run" feature can come later when you have data on how often outputs are actually weak.

---

## D. Proposed Plan Changes Summary

| # | Section | Change | Priority | Decision |
|---|---------|--------|----------|----------|
| A1 | Section 9 (Scoring) | Align to 5 dimensions + weights from prompts | High | **ACCEPTED** — applied to plan + architecture |
| A2 | Section 9 (Outputs) | Match output structure to actual prompt outputs | High | **ACCEPTED** — applied to plan Section 9.3 |
| A3 | Section 11-12 (MVP/Roadmap) | MVP = OpenRouter only, single provider | High | **ACCEPTED** — MVP narrowed to OpenRouter; additional providers are post-MVP. Keeps it clean and open. |
| A4 | Section 5 (Fallback) | Remove quality fallback from MVP; defer | Medium | **ACCEPTED** — Section 5.3 now explicitly deferred |
| A5 | Section 4.4 (CORS) | Replace with accurate Manifest V3 CORS explanation | Medium | **ACCEPTED** — Section 4.4 rewritten |
| A6 | Section 2 / Project-drive | Sharpen "no censorship" language to avoid contradiction | Medium | **ACCEPTED** — updated in project-drive.md + plan |
| B1 | NEW section | Response format: JSON mode (OpenRouter supports it) | High | **ACCEPTED** — plan Section 10.1; JSON mode primary, text regex fallback |
| B2 | NEW section | Token counting: char-based estimation (1 token ≈ 4 chars), 60% budget | High | **ACCEPTED** — plan Section 10.2; best fit for OpenRouter free tier |
| B3 | NEW section | Content type detection: KISS enum (article, social, video, forum, product, unknown) | High | **ACCEPTED** — plan Section 10.3 |
| B4 | NEW section | UI state machine (idle, extracting, analyzing, complete, error, partial) | Medium | **ACCEPTED** — plan Section 10.4; states will expand during issue writing |
| B5 | NEW section | Default settings: OpenRouter / Quick Scan / key required for free tier | Medium | **ACCEPTED** — plan Section 10.5; OpenRouter confirmed requires free API key |
| B6 | NEW section | Content size limits: 12K chars / 100 char minimum / truncate from end | Medium | **ACCEPTED** — plan Section 10.6 |
| B7 | NEW section | Provider spec: OpenRouter only (expandable) | High | **ACCEPTED** — plan Section 10.7; full API spec for OpenRouter |
| B8 | Testing strategy | TDD approach, Vitest, 25+ URL test battery, multi-provider eval later | Medium | **ACCEPTED** — to be generated as separate testing-strategy.md document |
| C1 | Scoring alignment | Plan scoring now matches prompts and architecture | High | **RESOLVED** via A1 |
| C2 | Popup-only UI | Results view should be decoupled for future side panel | Low | **ACCEPTED** — noted in architecture |
| C3 | Prompt file locations | Keep .md as docs, .js as code implementations | Low | **ACCEPTED** — files moved to docs/ |
| C4 | Quality fallback | Defer to post-MVP | Medium | **ACCEPTED** via A4 |

---

## E. Key Implementation Elements for Issue Generation

When creating issues from this plan + architecture, each issue should reference:

1. **Which component** it belongs to (from architecture Section 3)
2. **Which files** it touches (from architecture Section 7)
3. **Acceptance criteria** that can be verified
4. **Dependencies** on other issues (e.g., "provider adapter" issues depend on "provider manager interface" being defined first)

### Suggested issue grouping (epics → stories):

**Epic 1: Project Scaffolding**
- Set up manifest.json with permissions and structure
- Create directory structure per architecture
- Set up dev tooling (linting, test framework, reload helper)

**Epic 2: Content Extraction**
- Implement content script with DOM text extraction
- Add selection capture (highlighted text priority)
- Add metadata extraction (title, URL, OG tags)
- Add content type detection
- Add content trimming to token budget

**Epic 3: Provider Integration (OpenRouter)**
- Define provider interface (unified request/response types, expandable)
- Implement OpenRouter adapter (JSON mode + free router)
- Implement provider config + storage
- Add connection test ("check connection" button)

**Epic 4: Prompt Engine**
- Define response JSON schema
- Implement template system with variable injection
- Implement Quick Scan template
- Implement Standard Review template
- Implement response parser (JSON mode + text fallback)
- Implement score calculator (weighted BS Score)

**Epic 5: Analysis Pipeline & Fallback**
- Wire up background service worker as orchestrator
- Implement analysis state machine
- Implement fallback sequence (retry → downgrade mode → partial extraction)
- Add error handling for all failure types
- Handle service worker lifecycle (keep-alive during analysis)

**Epic 6: UI**
- Build popup shell with view routing
- Build analyze trigger + loading state
- Build results view (score gauge, component breakdown, claims, red flags)
- Build settings view (OpenRouter API key management, mode selection)
- Build onboarding flow
- Define and implement all error states

**Epic 7: Testing & QA**
- Unit tests for response parser + score calculator
- Unit tests for content extraction
- Mock API integration tests for each adapter
- Manual test suite with reference URLs
- End-to-end smoke test

---

## F. One Challenge to Consider

Here's something the plan doesn't address that could bite you: **the free-first strategy depends entirely on third-party generosity.** OpenRouter's free router, Gemini's free tier, Groq's free tier — any of these could change terms, add CAPTCHA, require phone verification, or just disappear tomorrow. The plan treats free access as a stable foundation, but it's really a promotional feature of these services.

The architecture handles this gracefully with fallback chains, which is good. But the *marketing* and *onboarding* should be honest: "Free models are available today but may change. For reliable, consistent analysis, configure your own API key." Otherwise you'll get support requests from users whose free tier broke and think your extension is buggy.

Consider adding a "provider health check" that runs on extension startup and updates available provider status in storage. This way the UI can proactively show "OpenRouter free is currently unavailable" instead of failing silently during analysis.
