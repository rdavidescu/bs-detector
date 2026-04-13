/**
 * BS Detector — Model Registry
 *
 * Static catalog of available models per provider with metadata:
 * pricing tier tags, context window, known limitations, and defaults.
 *
 * Future: fetch this from a remote JSON for dynamic updates (MP-04).
 */

import { PROVIDERS } from './config-loader.js';

/**
 * Tags that appear in brackets before the model name in the UI.
 *   FREE         — zero cost, may have rate limits / crowded servers
 *   RECOMMENDED  — best balance of quality/cost for BS detection
 *   PERFORMANT   — top-tier quality, higher cost
 *   EXPENSIVE    — flagship model, premium pricing
 */
export const MODEL_TAGS = Object.freeze({
  FREE: 'FREE',
  RECOMMENDED: 'RECOMMENDED',
  PERFORMANT: 'PERFORMANT',
  EXPENSIVE: 'EXPENSIVE',
});

/**
 * Model catalog — keyed by provider, each entry is an array of models.
 *
 * Fields:
 *   id       — API model identifier (sent in the request)
 *   name     — human-friendly display name
 *   tags     — array of MODEL_TAGS
 *   context  — context window size (tokens)
 *   note     — short note shown in UI (limits, warnings, etc.)
 *   default  — true if this is the default for this provider
 */
export const MODEL_CATALOG = Object.freeze({
  [PROVIDERS.OPENROUTER]: [
    {
      id: 'meta-llama/llama-3.3-70b-instruct',
      name: 'Llama 3.3 70B',
      tags: [MODEL_TAGS.RECOMMENDED],
      context: 131072,
      note: '$0.10/M input · Good accuracy, fast',
      default: true,
    },
    {
      id: 'meta-llama/llama-3.3-70b-instruct:free',
      name: 'Llama 3.3 70B',
      tags: [MODEL_TAGS.FREE],
      context: 131072,
      note: 'Free tier · 20 req/min, 200/day · May hit rate limits on crowded servers',
    },
    {
      id: 'mistralai/mistral-small-3.1-24b-instruct',
      name: 'Mistral Small 3.1',
      tags: [MODEL_TAGS.FREE],
      context: 131072,
      note: 'Free tier · Lighter model, faster · May be less accurate on nuanced analysis',
    },
    {
      id: 'google/gemma-3-27b-it:free',
      name: 'Gemma 3 27B',
      tags: [MODEL_TAGS.FREE],
      context: 131072,
      note: 'Free tier · Google model via OpenRouter · Server availability varies',
    },
    {
      id: 'mistralai/mistral-medium-3.1',
      name: 'Mistral Medium 3.1',
      tags: [MODEL_TAGS.PERFORMANT],
      context: 131072,
      note: '$0.40/M input · Strong reasoning, good for detailed analysis',
    },
    {
      id: 'anthropic/claude-sonnet-4',
      name: 'Claude Sonnet 4',
      tags: [MODEL_TAGS.PERFORMANT, MODEL_TAGS.EXPENSIVE],
      context: 200000,
      note: '$3/M input · Top-tier analysis quality · Premium cost',
    },
  ],

  [PROVIDERS.GEMINI]: [
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      tags: [MODEL_TAGS.FREE, MODEL_TAGS.RECOMMENDED],
      context: 1048576,
      note: 'Free: 1500 req/day · Best free option · Occasional 503 on crowded servers',
      default: true,
    },
    {
      id: 'gemini-2.5-flash-lite',
      name: 'Gemini 2.5 Flash Lite',
      tags: [MODEL_TAGS.FREE],
      context: 1048576,
      note: 'Free: 1500 req/day · Faster but less accurate · Good for quick checks',
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      tags: [MODEL_TAGS.PERFORMANT],
      context: 1048576,
      note: '$1.25/M input · Flagship quality · Best Gemini accuracy',
    },
    {
      id: 'gemini-3-flash',
      name: 'Gemini 3 Flash',
      tags: [MODEL_TAGS.PERFORMANT],
      context: 1048576,
      note: 'Paid · Latest generation · Fast and capable',
    },
  ],

  [PROVIDERS.GROK]: [
    {
      id: 'grok-3-mini',
      name: 'Grok 3 Mini',
      tags: [MODEL_TAGS.RECOMMENDED],
      context: 131072,
      note: '$0.30/M input · Budget-friendly · Scores may vary between runs',
      default: true,
    },
    {
      id: 'grok-3',
      name: 'Grok 3',
      tags: [MODEL_TAGS.PERFORMANT, MODEL_TAGS.EXPENSIVE],
      context: 131072,
      note: '$3/M input · Full model, more consistent scoring',
    },
  ],
});

/**
 * Get models for a given provider.
 * @param {string} provider
 * @returns {Array}
 */
export function getModelsForProvider(provider) {
  return MODEL_CATALOG[provider] || [];
}

/**
 * Get the default model ID for a provider.
 * @param {string} provider
 * @returns {string|null}
 */
export function getDefaultModelId(provider) {
  const models = getModelsForProvider(provider);
  const defaultModel = models.find((m) => m.default);
  return defaultModel ? defaultModel.id : (models[0]?.id || null);
}

/**
 * Find a model entry by provider + model ID.
 * @param {string} provider
 * @param {string} modelId
 * @returns {object|null}
 */
export function findModel(provider, modelId) {
  const models = getModelsForProvider(provider);
  return models.find((m) => m.id === modelId) || null;
}

/**
 * Format a model's tags for display: "[FREE] [RECOMMENDED] Model Name"
 * @param {object} model
 * @returns {string}
 */
export function formatModelLabel(model) {
  const tagStr = model.tags.map((t) => `[${t}]`).join(' ');
  return tagStr ? `${tagStr} ${model.name}` : model.name;
}
