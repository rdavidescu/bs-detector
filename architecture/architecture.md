# BS Detector — Architecture Document

**Status:** Proposed  
**Date:** 2026-04-10  
**Author:** Architecture review (AI-assisted)  
**Version:** 1.0

---

## 1. Overview

BS Detector is a **client-side Chrome extension** (Manifest V3) that analyzes web content for credibility signals using **user-owned AI credentials**. There is no central server, no content upload beyond the user's chosen AI provider, and no censorship layer. The extension acts as a smart proxy between web content and AI models.

### Core Architectural Principles

- **Client-side only** — all logic runs in the browser
- **User-owned AI** — bring your own API key, bring your own model
- **Free-first** — default to OpenRouter free tier, paid models available via same provider
- **Provider-agnostic** — abstracted integration layer (MVP: OpenRouter only, expandable)
- **Transparent scoring** — every output is explainable and traceable

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Browser                          │
│                                                             │
│  ┌──────────────┐    ┌──────────────────────────────────┐   │
│  │ Content Script│───▶│      Background Service Worker   │   │
│  │ (per tab)     │    │         (Manifest V3)            │   │
│  │               │    │                                  │   │
│  │ - DOM access  │    │  ┌────────────┐ ┌────────────┐  │   │
│  │ - Text extract│    │  │  Prompt    │ │  Provider   │  │   │
│  │ - Selection   │    │  │  Engine    │ │  Manager    │  │   │
│  │   capture     │    │  └─────┬──────┘ └──────┬─────┘  │   │
│  └──────────────┘    │        │                │        │   │
│                       │        ▼                ▼        │   │
│  ┌──────────────┐    │  ┌────────────┐ ┌────────────┐  │   │
│  │  Popup UI    │◀──▶│  │  Analysis  │ │  Fallback  │  │   │
│  │              │    │  │  Pipeline  │ │  Controller│  │   │
│  │ - Results    │    │  └────────────┘ └────────────┘  │   │
│  │ - Settings   │    │                                  │   │
│  │ - History    │    │  ┌────────────────────────────┐  │   │
│  └──────────────┘    │  │     Storage Manager        │  │   │
│                       │  │  (chrome.storage.local)    │  │   │
│                       │  └────────────────────────────┘  │   │
│                       └──────────────────────────────────┘   │
│                                    │                         │
└────────────────────────────────────┼─────────────────────────┘
                                     │ HTTPS (user's API key)
                          ┌──────────▼──────────┐
                          │   AI Provider APIs   │
                          │                      │
                          │  - OpenRouter (MVP)   │
                          │  - Gemini (future)    │
                          │  - Groq (future)      │
                          │  - HF (future)        │
                          └──────────────────────┘
```

---

## 3. Component Breakdown

### 3.1 Content Script

**Location:** Injected into active web pages  
**Responsibility:** Extract analyzable content from the DOM

**Key behaviors:**
- Extracts visible page text (article body, headlines, metadata)
- Captures user-selected text when available (takes priority over full page)
- Strips navigation, ads, and boilerplate using heuristics (Readability-style logic)
- Collects page metadata: title, URL, Open Graph tags, author info
- Sends extracted payload to the background service worker via `chrome.runtime.sendMessage`

**Content extraction strategy:**
- Primary: `document.body.innerText` with boilerplate filtering
- Enhanced: DOM tree walking to identify main content containers (`<article>`, `<main>`, `role="main"`)
- Selection override: `window.getSelection()` when user highlights text
- Token budget: trim content to fit provider context windows (configurable per provider)

**Security note:** Content scripts run in an isolated world but have DOM access. No API keys or sensitive data should ever touch the content script.

---

### 3.2 Background Service Worker

**Location:** Extension background context (Manifest V3 service worker)  
**Responsibility:** Central orchestrator — receives content, builds prompts, calls APIs, returns results

This is the brain of the extension. It coordinates all other components.

**Key behaviors:**
- Listens for analysis requests from content script or popup
- Delegates to Prompt Engine for prompt construction
- Delegates to Provider Manager for API execution
- Manages the Fallback Controller when requests fail
- Stores results via Storage Manager
- Keeps the popup UI updated with analysis state

**Lifecycle note:** Manifest V3 service workers are ephemeral — they can be terminated by Chrome after ~30 seconds of inactivity. Critical state must be persisted to `chrome.storage` rather than held in memory. Use `chrome.alarms` or active message ports to keep the worker alive during long API calls.

---

### 3.3 Provider Manager

**Responsibility:** Abstract AI provider differences behind a unified interface

```
┌─────────────────────────────────────────┐
│            Provider Manager             │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     Unified Request Interface   │    │
│  │  - analyzeContent(payload)      │    │
│  │  - testConnection(provider)     │    │
│  │  - getProviderStatus()          │    │
│  └──────────────┬──────────────────┘    │
│                 │                        │
│    ┌────────────┼────────────┐           │
│    ▼            ▼            ▼           │
│ ┌────────┐ ┌────────┐ ┌────────┐        │
│ │OpenRtr │ │Gemini  │ │ Groq   │  ...   │
│ │Adapter │ │(future)│ │(future)│        │
│ │ (MVP)  │ │        │ │        │        │
│ └────────┘ └────────┘ └────────┘        │
└─────────────────────────────────────────┘
```

**Each adapter handles:**
- API endpoint URL construction
- Authentication header format (Bearer token, API key param, etc.)
- Request body format translation (OpenAI-compatible, Gemini format, etc.)
- Response normalization — every provider returns a different shape; adapters normalize to a common `AnalysisResult` format
- Rate limit detection and backoff signaling
- Token counting / context window limits per model

**Provider config structure (per adapter):**

```javascript
{
  id: "openrouter",
  name: "OpenRouter",
  baseUrl: "https://openrouter.ai/api/v1",
  authType: "bearer",        // bearer | query_param | header
  freeModels: ["openrouter/free"],
  paidModels: ["anthropic/claude-3-haiku", "..."],
  maxContextTokens: 4096,    // varies by model
  requestFormat: "openai",   // openai | gemini | custom
  rateLimits: { rpm: 20, tpd: 100000 }
}
```

---

### 3.4 Prompt Engine

**Responsibility:** Build structured prompts from extracted content and user preferences

This is the **core IP** of the project. The Prompt Engine selects and populates prompt templates based on the analysis mode.

**Analysis modes:**
- **Quick Scan** — fast, low-token, 5-dimension scoring (see `bs_detector_quick_prompt.md`)
- **Standard Review** — balanced depth, anti-drift checks, claim breakdown (see `bs_detector_standard_prompt.md`)
- **Deep Analysis** — (future) multi-pass, cross-reference, domain-aware

**Template system:**

```javascript
{
  mode: "quick" | "standard" | "deep",
  systemPrompt: "You are a credibility review assistant...",
  userPromptTemplate: "Analyze this content:\nTitle: {{page_title}}\n...",
  variables: {
    page_title: "",
    page_url: "",
    content_type: "",
    page_content: "",
    user_focus: "",
    metadata: ""
  },
  outputSchema: { ... },   // expected response structure
  tokenBudget: 2000,       // max tokens for content insertion
  calibrationAnchors: { ... }
}
```

**Prompt construction pipeline:**
1. Receive extracted content from content script
2. Detect content type (article, social post, video page, forum, etc.)
3. Select prompt template based on analysis mode
4. Trim content to fit token budget (provider-specific)
5. Inject variables into template
6. Attach calibration anchors and scoring rules
7. Return assembled prompt + expected output schema

---

### 3.5 Analysis Pipeline

**Responsibility:** Orchestrate the full analysis flow from trigger to result

```
User clicks "Analyze"
       │
       ▼
 Extract content (Content Script)
       │
       ▼
 Build prompt (Prompt Engine)
       │
       ▼
 Select provider (Provider Manager)
       │
       ▼
 Send API request ──── failure ──▶ Fallback Controller
       │                                    │
       ▼                                    ▼
 Parse response                    Retry / next provider
       │                                    │
       ▼                                    │
 Validate output schema ◀──────────────────┘
       │
       ▼
 Compute weighted BS Score
       │
       ▼
 Store result (Storage Manager)
       │
       ▼
 Render in Popup UI
```

**Response parsing:**
- Validate that AI response matches expected output structure
- Extract component scores, claims, red flags
- Compute weighted General BS Score (Evidence 30%, Context 20%, Certainty 20%, Emotion 15%, Source 15%)
- Attach confidence level and metadata
- Handle malformed responses gracefully (partial results > no results)

---

### 3.6 Fallback Controller

**Responsibility:** Handle failures gracefully across the provider chain

**MVP fallback sequence (OpenRouter only):**
1. Retry same request once (2s delay)
2. Downgrade analysis depth (Standard → Quick)
3. Show partial extraction + manual copy-paste option

**Post-MVP (multi-provider):**
1. Retry same provider (1x)
2. Fallback to next provider in chain
3. Downgrade analysis depth
4. Show partial extraction + copy-paste

**Failure types handled:**
- HTTP errors (429 rate limit, 500 server error, timeout)
- Malformed / empty responses
- Model unavailable
- API key invalid or expired
- Context window exceeded

**Behavior rules:**
- Max 2 retries per provider before moving to next
- Exponential backoff on rate limits (1s, 3s, 10s)
- If all providers fail, show what we have (partial extraction) and suggest the user try again or paste into their own AI chat
- Log failure chain for debugging (stored locally, never transmitted)

---

### 3.7 Storage Manager

**Responsibility:** Persist all local data using `chrome.storage.local`

**Data domains:**

| Domain | Key Pattern | Contents |
|--------|-------------|----------|
| API Keys | `keys_{provider}` | Encrypted API keys per provider |
| Settings | `settings` | User preferences, default provider, analysis mode |
| History | `history_{timestamp}` | Past analysis results with URL, scores, date |
| Provider State | `provider_state` | Last known status, rate limit counters |
| Prompt Templates | `prompts_{mode}` | Cached prompt templates (for future custom prompts) |

**Security:**
- API keys stored in `chrome.storage.local` only — never synced, never transmitted outside API calls
- Keys should be encrypted at rest using Web Crypto API with a user-derived key (stretch goal for MVP)
- History is local-only, user can clear it anytime
- No telemetry, no analytics, no external tracking

**Storage limits:**
- `chrome.storage.local` has a 10MB limit (configurable via `unlimitedStorage` permission if needed)
- Implement LRU eviction for history entries (keep last 500 analyses by default)

---

### 3.8 Popup UI

**Responsibility:** Primary user interface for triggering analysis and viewing results

**Views:**

1. **Main View** — one-click analyze button, last result preview
2. **Results View** — full analysis display with scores, claims, red flags
3. **Settings View** — provider config, API key management, analysis mode selection
4. **History View** — past analyses, searchable/filterable
5. **Onboarding View** — first-run setup wizard for provider keys

**UI technology:** HTML + CSS + vanilla JS (or lightweight framework like Preact/Lit for reactivity without bloat). Avoid heavy frameworks — keep the extension small and fast.

**Results display:**
- BS Score as a prominent gauge/meter (color-coded: green → yellow → red)
- Component scores as a breakdown bar or radar chart
- Claims and red flags as collapsible sections
- Confidence indicator
- Suggested action as a highlighted callout
- "Powered by [provider/model]" footer for transparency

---

## 4. Data Flow

### 4.1 Analysis Request Flow

```
[Web Page] ──extract──▶ [Content Script]
                              │
                     sendMessage (content payload)
                              │
                              ▼
                   [Background Service Worker]
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
             [Prompt Engine]    [Provider Manager]
                    │                    │
                    └────────┬───────────┘
                             │
                    assembled API request
                             │
                             ▼
                     [AI Provider API]
                             │
                       raw response
                             │
                             ▼
                   [Analysis Pipeline]
                     parse + score
                             │
                             ▼
                    [Storage Manager]
                      persist result
                             │
                             ▼
                      [Popup UI]
                    display to user
```

### 4.2 Message Protocol

All inter-component communication uses Chrome's messaging API with typed messages:

```javascript
// Content Script → Background
{ type: "ANALYZE_REQUEST", payload: { title, url, content, contentType, selection, metadata } }

// Background → Popup
{ type: "ANALYSIS_STATE", state: "pending" | "in_progress" | "complete" | "error" }
{ type: "ANALYSIS_RESULT", result: { bsScore, components, claims, redFlags, confidence, action } }

// Popup → Background
{ type: "TRIGGER_ANALYSIS", mode: "quick" | "standard" | "deep" }
{ type: "UPDATE_SETTINGS", settings: { ... } }

// Background → Content Script
{ type: "EXTRACT_CONTENT", options: { useSelection: true } }
```

---

## 5. Scoring Architecture

### 5.1 Scoring Dimensions

| Dimension | Weight | Range | What It Measures |
|-----------|--------|-------|-----------------|
| Evidence Weakness | 30% | 0–10 | Source quality, citation strength, support for claims |
| Context Loss | 20% | 0–10 | Cherry-picking, missing nuance, stripped context |
| Certainty Inflation | 20% | 0–10 | Overconfidence, absolute claims, inevitability framing |
| Emotional Pressure | 15% | 0–10 | Fear, outrage, urgency, attention-engineered language |
| Source Transparency | 15% | 0–10 | Traceability of claims to identifiable sources |

### 5.2 General BS Score Calculation

```
BS Score = (evidence × 3 + context × 2 + certainty × 2 + emotion × 1.5 + source × 1.5) / 10 × 10
```

Result: 0–100 scale, rounded to nearest integer.

### 5.3 Calibration Anchors

| Band | Score Range | Pattern |
|------|------------|---------|
| Low BS | 0–20 | Calm, sourced, nuanced, uncertainty acknowledged |
| Mild Concerns | 21–40 | Mostly sound, minor gaps |
| Mixed | 41–60 | Partial evidence, some exaggeration, selective framing |
| High BS | 61–80 | Emotional framing, cherry-picked, weak sources |
| Very High BS | 81–100 | Strong manipulation signals, absent evidence |

### 5.4 Anti-Drift Mechanism (Standard + Deep modes)

After initial scoring, the AI model is instructed to:
1. Re-read its own component scores and reasons
2. Check if reasons justify the numbers
3. Compare against calibration anchors
4. Adjust if misaligned
5. Reduce confidence (not inflate score) if sample is partial

This is embedded in the prompt, not enforced in code — but the output parser should flag obvious inconsistencies (e.g., all components scored 2/10 but BS Score is 70).

---

## 6. Security Model

### 6.1 Threat Surface

| Threat | Mitigation |
|--------|-----------|
| API key theft via content script | Keys never touch content scripts; stored and used only in background worker |
| API key theft via extension storage | Encrypt at rest (Web Crypto API); local-only storage |
| Man-in-middle on API calls | HTTPS only; no HTTP fallback |
| Malicious page manipulating extraction | Content script runs in isolated world; sanitize extracted text |
| Prompt injection via page content | Wrap user content in clear delimiters; instruct model to treat as data |
| Extension permissions over-reach | Request minimum permissions: `activeTab`, `storage`; avoid `<all_urls>` |

### 6.2 Permissions (Manifest V3)

```json
{
  "permissions": ["activeTab", "storage"],
  "host_permissions": [
    "https://openrouter.ai/*"
  ]
}
// Future providers will add:
// "https://generativelanguage.googleapis.com/*"  (Gemini)
// "https://api.groq.com/*"                       (Groq)
// "https://api-inference.huggingface.co/*"        (Hugging Face)
```

**Why `activeTab` over `<all_urls>`:** The extension only needs access to the current tab when the user explicitly clicks analyze. `activeTab` grants temporary access only on user gesture, which is both safer and easier to get approved in the Chrome Web Store.

---

## 7. Extension Manifest Structure

```
bs-detector/
├── manifest.json
├── background/
│   ├── service-worker.js        # Entry point, message router
│   ├── analysis-pipeline.js     # Orchestration logic
│   ├── fallback-controller.js   # Retry and fallback chain
│   └── storage-manager.js       # chrome.storage abstraction
├── content/
│   └── content-script.js        # DOM extraction logic
├── providers/
│   ├── provider-manager.js      # Unified provider interface
│   ├── adapters/
│   │   └── openrouter.js        # MVP adapter (Gemini, Groq, HF added post-MVP)
│   └── provider-config.js       # Provider metadata and defaults
├── prompts/
│   ├── prompt-engine.js         # Template selection and assembly
│   ├── templates/
│   │   ├── quick.js
│   │   ├── standard.js
│   │   └── deep.js              # Future
│   └── calibration.js           # Scoring anchors
├── ui/
│   ├── popup.html
│   ├── popup.js
│   ├── popup.css
│   ├── components/
│   │   ├── score-gauge.js       # BS Score visual meter
│   │   ├── score-breakdown.js   # Component scores display
│   │   ├── claims-list.js       # Claims and red flags
│   │   └── settings-panel.js    # Provider and mode config
│   ├── onboarding/
│   │   ├── onboarding.html
│   │   └── onboarding.js
│   └── history/
│       ├── history.html
│       └── history.js
├── shared/
│   ├── constants.js             # Shared enums, config
│   ├── message-types.js         # Message protocol definitions
│   └── utils.js                 # Common utilities
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── _locales/                    # i18n (future)
    └── en/
        └── messages.json
```

---

## 8. Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Extension standard | Manifest V3 | Required for Chrome Web Store; modern service worker model |
| UI framework | Vanilla JS or Preact | Minimal bundle size; fast popup load; no build step required for vanilla |
| Styling | Plain CSS or Tailwind (CDN) | Keep it lightweight; no build pipeline dependency |
| State management | chrome.storage + in-memory cache | Service worker ephemeral — must persist to storage; cache for fast reads |
| Build tool | None (MVP) → Rollup/Vite (later) | Start simple; add bundling when module count justifies it |
| Testing | Vitest or Jest + Chrome Extension Testing Library | Unit test adapters and prompt engine; integration test with mock APIs |
| API format | Primarily OpenAI-compatible | Most providers support or can be adapted to OpenAI chat completion format |

---

## 9. MVP Scope (Architecture Subset)

For the MVP, implement this subset:

**Must build:**
- Content Script with basic text extraction + content type detection
- Background Service Worker with message routing
- Provider Manager with OpenRouter adapter only (expandable interface)
- Prompt Engine with Quick and Standard templates
- JSON response parsing (with text fallback)
- Fallback Controller (retry → downgrade mode → partial extraction)
- Storage Manager for API key + settings
- Popup UI with analyze button, results view, settings, error states
- Onboarding flow for OpenRouter API key setup
- Token estimation and content trimming

**Defer to post-MVP:**
- Gemini, Groq, and Hugging Face adapters
- Multi-provider fallback chain
- Deep Analysis mode
- History view with search
- Custom prompt templates
- API key encryption at rest
- Domain-specific analysis (health, finance, science)
- Community prompt sharing
- Side panel UI
- i18n

---

## 10. Risks and Trade-offs

### 10.1 Service Worker Lifecycle

**Risk:** Manifest V3 service workers can be killed mid-API-call.  
**Mitigation:** Use `chrome.runtime.onConnect` to keep a port open during analysis. Persist intermediate state to storage. Implement request resumption or at minimum clear error reporting if killed.

### 10.2 Free Tier Instability

**Risk:** Free models change availability, rate limits, and quality without notice.  
**Mitigation:** Fallback chain + graceful degradation. Monitor provider status. User-facing messaging when free tier is unavailable ("Free models are busy — try again or add a paid API key for faster results").

### 10.3 Scoring Consistency

**Risk:** Different AI models produce different scores for the same content.  
**Mitigation:** Calibration anchors in prompts. Anti-drift checks. Future: run consistency tests across models and publish results. Accept that scores are estimates, not verdicts — the UI should always communicate this.

### 10.4 Prompt Injection

**Risk:** Malicious page content could manipulate the AI's analysis.  
**Mitigation:** Wrap content in clear XML-style delimiters. Instruct model to treat content as data to analyze, not instructions to follow. Post-process response for obviously manipulated outputs (e.g., score of 0 on clearly problematic content).

### 10.5 Chrome Web Store Approval

**Risk:** Extensions making external API calls face extra scrutiny.  
**Mitigation:** Minimal permissions (`activeTab` + `storage`). Clear privacy policy. Explicit `host_permissions` only for known AI APIs. No data collection.

---

## 11. Future Architecture Considerations

These are not in scope for MVP but should influence current design decisions:

- **Deep Analysis mode** — multi-pass analysis with cross-referencing; may require chaining multiple API calls
- **Domain adapters** — specialized scoring logic for health, finance, politics, science content
- **Cross-source comparison** — analyze multiple articles on the same topic for perspective diversity
- **Community prompt marketplace** — user-contributed and rated prompt templates
- **Browser action badge** — show a quick score indicator on the extension icon without opening popup
- **Side panel UI** — Chrome's Side Panel API for persistent analysis view alongside browsing
- **Export/share** — generate shareable analysis reports

---

## 12. Action Items

1. [ ] Set up project scaffolding with the directory structure above
2. [ ] Implement Content Script with basic extraction + content type detection
3. [ ] Build Provider Manager interface + OpenRouter adapter
4. [ ] Build Prompt Engine with Quick template + JSON response schema
5. [ ] Wire up Background Service Worker as orchestrator
6. [ ] Implement response parser (JSON mode + text fallback)
7. [ ] Build minimal Popup UI (analyze button + results + error states)
8. [ ] Implement fallback controller (retry → downgrade → partial)
9. [ ] Implement Standard prompt template + anti-drift
10. [ ] Build onboarding flow for OpenRouter API key
11. [ ] Test end-to-end on real web pages (25+ URL test battery)
12. [ ] Prepare Chrome Web Store submission package
