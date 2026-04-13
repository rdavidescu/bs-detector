/**
 * BS Detector — Adapter Factory
 *
 * Picks the right API adapter based on provider name.
 * Single entry point for the pipeline — it doesn't need to know
 * which provider is active, just calls callProvider().
 */

import { PROVIDERS } from '../shared/config-loader.js';
import { callOpenRouter } from './adapters/openrouter.js';
import { callGemini } from './adapters/gemini.js';
import { callGrok } from './adapters/grok.js';

const ADAPTER_MAP = {
  [PROVIDERS.OPENROUTER]: callOpenRouter,
  [PROVIDERS.GEMINI]: callGemini,
  [PROVIDERS.GROK]: callGrok,
};

/**
 * Get the adapter function for a given provider.
 *
 * @param {string} provider
 * @returns {Function}
 * @throws {Error} If provider is unknown
 */
export function getAdapter(provider) {
  const adapter = ADAPTER_MAP[provider];
  if (!adapter) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return adapter;
}

/**
 * Call the appropriate provider adapter.
 *
 * @param {{
 *   provider: string,
 *   messages: Array<{ role: string, content: string }>,
 *   apiKey: string,
 *   model?: string
 * }} params
 * @returns {Promise<{ success: boolean, content?: string, error?: string }>}
 */
export async function callProvider(params) {
  const { provider, ...rest } = params;
  const adapter = getAdapter(provider);
  return adapter(rest);
}
