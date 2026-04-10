# BS Detector for Chrome (Client-Side, User-Owned AI, Free-First Strategy)

## Project Plan (Revised v2)

### 1. Project summary
BS Detector is a Chrome extension that lets users analyze suspicious content using **their own AI credentials**. The extension runs as a smart proxy: it extracts page content, builds structured prompts, and sends them directly to the user’s chosen AI provider.

**No central analysis server. No content upload to third-party services beyond the user’s chosen model.**

---

## 2. Key principles (refined)
- User-owned AI (bring your own API key)
- Free-first access (lower entry barrier)
- No censorship (surface patterns, not truth verdicts — the user always sees the reasoning)
- Transparent uncertainty
- Lightweight UX

---

## 3. Provider strategy (revised for MVP)

### 3.1 MVP provider: OpenRouter

The MVP ships with **OpenRouter only**. This keeps the codebase clean, reduces adapter complexity, and lets us focus on getting the core analysis experience right.

OpenRouter provides:
- Free router (`openrouter/free`) — auto-selects a free model
- Access to 200+ models via a single API (including paid tiers)
- OpenAI-compatible API format
- JSON mode support (`response_format: { type: "json_object" }`)

**API key required:** Yes, even for free tier. Users must create a free OpenRouter account and generate an API key. No credit card needed.

**Free tier limits (as of 2026-04):**
- 50 requests/day on free models (new accounts)
- 1,000 requests/day on free models (accounts with 10+ credits purchased)
- 20 requests/minute on `:free` model variants
- 200,000 token context window

### 3.2 Future providers (post-MVP)

The provider abstraction layer is designed to be expandable. Planned additions:
- Google Gemini (free tier, native JSON mode)
- Groq (fast inference, OpenAI-compatible)
- Hugging Face Inference (broad model access)

Each future provider adds via a new adapter — no changes to core logic.

### 3.3 Paid / custom mode (post-MVP)
User can:
- select specific model from OpenRouter's catalog
- override prompt style
- prioritize accuracy vs cost vs speed

---

## 4. Implementation strategy (NEW)

### 4.1 Client-side architecture
- Chrome extension (Manifest V3)
- content script → extract page text
- background script → manage API calls
- local storage → store API keys + history

### 4.2 API integration layer
Create a provider abstraction (expandable, MVP = OpenRouter only):
- unified request/response interface
- provider adapters (MVP: OpenRouter adapter)
- response normalization to canonical JSON format
- designed for future adapters without core changes

### 4.3 Prompt engine (core IP)
- modular templates
- analysis modes (Quick / Standard / Deep)
- bias balancing instructions
- output schema enforcement

### 4.4 Request handling

API calls are made from the background service worker, which **bypasses CORS restrictions** in Manifest V3. No proxy needed. Host permissions for each provider API must be declared in `manifest.json`.

Error handling:
- rate limits (HTTP 429) → retry with backoff
- model unavailable → notify user
- malformed responses → attempt partial parse, fallback to error state
- timeout → configurable per request (default 30s)

---

## 5. Fallback system (revised for MVP)

### 5.1 MVP fallback sequence (OpenRouter only)

Single clear sequence when a request fails:
1. **Retry** same request once (with 2s delay)
2. **Downgrade mode** if on Standard → retry as Quick Scan (lower token cost, more likely to succeed)
3. **User fallback** → show partial extraction + offer manual copy-paste prompt

Since MVP uses a single provider, there is no multi-provider fallback chain. The focus is on graceful degradation within OpenRouter.

### 5.2 Post-MVP fallback (when additional providers are added)

When multiple providers are available, the sequence becomes:
1. Retry same provider (1x)
2. Fallback to next provider in configured chain
3. Downgrade analysis depth
4. User fallback (partial extraction + copy-paste)

### 5.3 Deferred: Quality re-run

> Deferred to post-MVP. Original concept: if output quality is weak, re-run with a stricter prompt or switch to a more capable model. This requires defining what "stricter" means and building prompt variants. The anti-drift mechanism in the Standard prompt partially addresses this. Full quality re-run will be spec'd when we have usage data on how often outputs are actually weak.

---

## 6. API key UX (critical)

### 6.1 Setup flow
- simple onboarding screen
- step-by-step guide per provider
- test button (“check connection”)

### 6.2 Storage
- local only (chrome.storage)
- never transmitted externally

### 6.3 Safety warnings
- user pays for usage (if not free tier)
- quality depends on model

---

## 7. Core features (MVP)
- one-click analysis
- OpenRouter integration (expandable provider abstraction)
- structured credibility report (JSON-parsed)
- Quick Scan + Standard Review modes
- graceful fallback (retry → downgrade → partial extraction)
- API key onboarding with connection test

---

## 8. Analysis model (unchanged core)
- claim extraction
- evidence review
- manipulation detection
- uncertainty reporting

---

## 9. Scoring system

### 9.1 Scoring dimensions (5 canonical factors)

| Dimension | Weight | Range | What it measures |
|-----------|--------|-------|-----------------|
| Evidence Weakness | 30% | 0–10 | Source quality, citation strength, support for claims |
| Context Loss | 20% | 0–10 | Cherry-picking, missing nuance, stripped context |
| Certainty Inflation | 20% | 0–10 | Overconfidence, absolute claims, inevitability framing |
| Emotional Pressure | 15% | 0–10 | Fear, outrage, urgency, attention-engineered language |
| Source Transparency | 15% | 0–10 | Traceability of claims to identifiable sources |

Scale: 0 = strong/clear/nuanced → 10 = weak/missing/distorted

> Note: earlier drafts listed 6 factors (source integrity, context preservation, evidence strength, certainty inflation, emotional manipulation, cherry-picking). These were consolidated into the 5 dimensions above during prompt development. "Cherry-picking" is captured within Context Loss; "source integrity" became Source Transparency; "evidence strength" became Evidence Weakness (inverted scale for intuitive scoring where higher = worse).

### 9.2 General BS Score

Weighted composite score from 0 to 100:
- BS Score = (Evidence×3 + Context×2 + Certainty×2 + Emotion×1.5 + Source×1.5) / 10 × 10
- Rounded to nearest whole number

Interpretation bands:
- 0–20: low BS risk
- 21–40: mild concerns
- 41–60: mixed / notable concerns
- 61–80: high BS risk
- 81–100: very high BS risk

### 9.3 Outputs (per analysis)

- General BS Score (0–100) with one-line justification
- Component Scores (5 dimensions, each 0–10 with short reason)
- Main Claims (up to 3 for Quick, up to 5 for Standard)
- Red Flags (concrete, supported by provided content)
- Confidence level (low / medium / high)
- Suggested User Action (one short, practical suggestion)

---

## 10. Implementation details

### 10.1 Response format: JSON

AI responses must be parsed reliably in code. Strategy:

**MVP (OpenRouter):** Use JSON mode (`response_format: { type: "json_object" }`). OpenRouter supports this on compatible models. Define a canonical JSON schema for the expected output structure.

**Fallback:** If a model doesn't support JSON mode, use regex-based text parsing with defined patterns for each output section. Partial parse is acceptable — show what we could extract.

Canonical response schema (simplified):
```json
{
  "summary": "string",
  "bs_score": { "score": 0, "justification": "string" },
  "components": {
    "evidence_weakness": { "score": 0, "reason": "string" },
    "context_loss": { "score": 0, "reason": "string" },
    "certainty_inflation": { "score": 0, "reason": "string" },
    "emotional_pressure": { "score": 0, "reason": "string" },
    "source_transparency": { "score": 0, "reason": "string" }
  },
  "claims": ["string"],
  "red_flags": ["string"],
  "confidence": "low | medium | high",
  "suggested_action": "string"
}
```

### 10.2 Token counting and content trimming

Different models use different tokenizers, and client-side accurate counting is impractical for MVP.

**MVP approach:** Character-based estimation (1 token ≈ 4 characters for English text). Apply a safety margin: use only 60% of max context window for content, reserve 40% for prompt template + expected response.

**Default content budget:** 3,000 tokens (~12,000 characters).

**Trimming strategy:** Truncate from the end with a `[content truncated — analysis based on first ~3000 tokens]` marker appended. Smarter extraction (priority paragraphs, lead + conclusion) is a post-MVP enhancement.

Per-provider token limits are stored in provider config and can be overridden.

### 10.3 Content type detection

The prompt accepts a `{{content_type}}` variable. Keep detection simple (KISS).

Valid values:
- `article` — page has `<article>` tag, or long-form text with multiple paragraphs
- `social_post` — URL matches known social platforms (twitter/x.com, facebook, reddit, linkedin)
- `video_page` — URL matches video platforms (youtube, vimeo) or page contains `<video>` element
- `forum` — URL patterns or thread-like DOM structure (comment chains)
- `product_page` — e-commerce patterns (price elements, "add to cart" buttons)
- `unknown` — default fallback

Detection runs in the content script. The AI model works fine with `unknown` — no special behavior is needed per type for MVP.

### 10.4 UI state machine

The popup UI operates through these states:

| State | What the user sees |
|-------|-------------------|
| `idle` | Analyze button, no results yet |
| `extracting` | "Reading page..." spinner |
| `analyzing` | "Analyzing with [model]..." spinner + provider name |
| `complete` | Full results view (scores, claims, flags) |
| `error` | Error message with type-specific guidance |
| `partial` | Some data available, analysis incomplete |

Error sub-types:
- `invalid_key` → "Your API key is invalid. Check your OpenRouter settings."
- `rate_limited` → "Free tier limit reached. Try again in [time] or upgrade."
- `timeout` → "Analysis timed out. The page may be too long — try selecting a shorter section."
- `provider_down` → "OpenRouter is unreachable. Check your internet connection."
- `parse_error` → "The AI response couldn't be read. Try again."

State transitions will be expanded during implementation issue writing.

### 10.5 Default settings (fresh install)

| Setting | Default | Notes |
|---------|---------|-------|
| Provider | OpenRouter | Only option in MVP |
| Model | `openrouter/free` | Free router, auto-selects |
| Analysis mode | Quick Scan | Lower token cost, fits free tier limits |
| API key | empty | Onboarding triggers on first analyze click |
| Content budget | 3,000 tokens | ~12,000 characters |
| Request timeout | 30 seconds | |

**Onboarding flow:** Triggered on first "Analyze" click if no API key is configured. Step-by-step guide to create OpenRouter account + generate key. "Test Connection" button to verify before saving. User can skip but analyze won't work without a key.

### 10.6 Content size limits

| Limit | Value | Notes |
|-------|-------|-------|
| Max content for analysis | 12,000 chars (~3K tokens) | Trimmed from end if exceeded |
| Min content for analysis | 100 chars | Below this, warn "not enough content" |
| Max metadata fields | 500 chars total | Title + URL + OG tags |
| Selected text priority | Always | If user selected text, use it over full page |

### 10.7 Provider specification: OpenRouter

| Property | Value |
|----------|-------|
| API format | OpenAI-compatible (chat completions) |
| Base URL | `https://openrouter.ai/api/v1/chat/completions` |
| Auth | Bearer token in `Authorization` header |
| Free model | `openrouter/free` (auto-routes to available free model) |
| JSON mode | `response_format: { type: "json_object" }` on compatible models |
| Rate limits (free) | 50 req/day (new), 1000 req/day (10+ credits), 20 rpm on `:free` variants |
| Context window | Up to 200K tokens (model-dependent) |
| Required headers | `HTTP-Referer` (your site), `X-Title` (app name) — recommended by OpenRouter |

This section will expand as new providers are added post-MVP.

---

## 11. Risks (updated)

### 11.1 Free tier dependency (OpenRouter)
- Rate limits may change without notice
- Free models rotate — quality and availability vary
- Inconsistent output across different free models behind the router

Mitigation:
- Retry + downgrade fallback chain
- User-facing messaging: "Free tier is limited — for reliable analysis, consider adding credits"
- Design for future multi-provider fallback

### 11.2 Model bias
Mitigation:
- Structured prompts with explicit neutrality instructions
- Anti-drift calibration checks in Standard mode
- Scores are estimates, not verdicts — always communicate this

### 11.3 API key exposure
Mitigation:
- Local storage only (`chrome.storage.local`)
- Keys never transmitted beyond API calls
- Clear warnings during onboarding

### 11.4 UX friction (API key setup)
Mitigation:
- Step-by-step onboarding guide for OpenRouter
- "Test Connection" button before saving
- Clear "why do I need this?" explanation

---

## 12. MVP scope (revised — OpenRouter only)

Must have:
- Chrome extension (Manifest V3) with content extraction
- OpenRouter integration (free router + paid models via single adapter)
- Quick Scan + Standard Review analysis modes
- JSON response format with fallback text parsing
- Onboarding flow for OpenRouter API key setup
- Popup UI: analyze button, results view, settings, error states
- Fallback: retry → downgrade mode → partial extraction
- Local storage for API key + settings

Not in MVP:
- Additional providers (Gemini, Groq, Hugging Face)
- Deep Analysis mode
- Analysis history
- API key encryption at rest
- Domain-specific analysis
- Custom prompt templates
- Community features
- i18n

---

## 13. Roadmap (revised)

Phase 1 — MVP (OpenRouter):
- Extension scaffolding + content extraction
- OpenRouter adapter + provider abstraction
- Prompt engine (Quick + Standard)
- Response parsing (JSON mode)
- Popup UI + onboarding
- Fallback system (retry + downgrade)
- End-to-end testing

Phase 2 — Multi-provider:
- Gemini adapter
- Groq adapter
- Multi-provider fallback chain
- Provider health check on startup

Phase 3 — Depth + polish:
- Deep Analysis mode
- Analysis history with search
- Badge score indicator on extension icon
- Performance tuning + token optimization

Phase 4 — Customization:
- Custom prompt templates
- Domain-specific analysis (health, finance, science)
- Side panel UI option

Phase 5 — Community:
- Community prompt marketplace
- Cross-source comparison
- Export/share analysis reports

---

## 14. Positioning
BS Detector is a **user-owned, client-side credibility assistant** that leverages existing AI ecosystems while remaining independent, transparent, and free from central control.

---

## 15. Taglines
- Smell the spin
- Think twice, faster
- Before you believe, inspect
- Your AI, your judgment

