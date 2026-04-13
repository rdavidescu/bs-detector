# MP-04: Model Selector per Provider

## Summary

Add a model dropdown in Settings under each provider card so users can pick which AI model to use for analysis. Each model shows tags ([FREE], [RECOMMENDED], [PERFORMANT], [EXPENSIVE]) and notes about pricing, rate limits, and availability caveats.

## Problem

Users have no visibility or control over which model is used for analysis. Different models have vastly different cost/quality tradeoffs — e.g. OpenRouter offers free Llama 3.3 70B (rate-limited, crowded servers) vs paid Claude Sonnet 4 ($3/M input, top-tier quality). Users should understand these tradeoffs and pick what works for them.

Free-tier models can hit rate limits or 503 errors on crowded servers. Without context, users blame the extension instead of the provider. Tags and notes surface this information upfront.

## Solution

### Model Registry (`src/shared/model-registry.js`)

Static catalog of models keyed by provider. Each model entry has:

| Field     | Type       | Description                                    |
|-----------|------------|------------------------------------------------|
| `id`      | string     | API model identifier sent in requests          |
| `name`    | string     | Human-friendly display name                    |
| `tags`    | string[]   | Subset of `FREE`, `RECOMMENDED`, `PERFORMANT`, `EXPENSIVE` |
| `context` | number     | Context window size (tokens)                   |
| `note`    | string     | Short note shown in UI (pricing, limits, caveats) |
| `default` | boolean    | True if this is the provider's default model   |

**Current catalog:**

- **OpenRouter** (6 models): Llama 3.3 70B (paid + free), Mistral Small 3.1 (free), Gemma 3 27B (free), Mistral Medium 3.1, Claude Sonnet 4
- **Gemini** (4 models): 2.5 Flash (free, default), 2.5 Flash Lite (free), 2.5 Pro, 3 Flash
- **Grok** (2 models): grok-3-mini (default), grok-3

### Model Selector UI (`src/ui/model-selector.js`)

- Dropdown appears inside each provider card when that provider has a key configured
- Shows `formatModelLabel()` output: `[FREE] [RECOMMENDED] Gemini 2.5 Flash`
- Note text below dropdown updates on selection change
- Selection persisted to `chrome.storage.local` as `{provider}Model` (e.g. `geminiModel`)
- Falls back to provider default when no stored preference

### Pipeline Integration

- Service worker reads stored model via `getActiveModelId(provider)`
- Model ID flows through: `service-worker → runAnalysis → callWithRetry → callProvider → adapter`
- Each adapter already accepts optional `model` param with its own default fallback

## Tags

| Tag          | Meaning                                                |
|--------------|--------------------------------------------------------|
| FREE         | Zero cost, may have rate limits or crowded servers     |
| RECOMMENDED  | Best balance of quality/cost for BS detection          |
| PERFORMANT   | Top-tier quality, higher cost                          |
| EXPENSIVE    | Flagship model, premium pricing                        |

## Test Coverage

- `tests/unit/model-registry.test.js` — 12 tests: catalog structure, field validation, exactly one default per provider, valid tags, helper functions
- `tests/unit/model-selector.test.js` — 9 tests: dropdown population, tag display, default selection, stored preference, note display, storage on change, note update on change, getStoredModelId

**172 total tests passing, lint clean.**

## Files Changed

| File | Change |
|------|--------|
| `src/shared/model-registry.js` | NEW — model catalog + helpers |
| `src/ui/model-selector.js` | NEW — dropdown builder + storage |
| `src/ui/options.html` | Added `.model-selector-wrapper` to each provider card |
| `src/ui/options.js` | Import + call `buildModelSelector` per provider in refreshUI |
| `src/ui/options.css` | Model selector styling |
| `src/background/service-worker.js` | Read stored model, pass to pipeline |
| `src/background/analysis-pipeline.js` | Accept + forward `model` param |
| `tests/unit/model-registry.test.js` | NEW — 12 tests |
| `tests/unit/model-selector.test.js` | NEW — 9 tests |

## Future

- **MP-04a**: Fetch model catalog from remote JSON for dynamic updates (no extension update needed for new models)
- **MP-04b**: Show estimated cost-per-analysis based on average content size
- **MP-04c**: Auto-fallback to free model when paid model hits billing limits
