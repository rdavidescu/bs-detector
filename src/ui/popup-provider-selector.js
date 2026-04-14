/**
 * BS Detector — Popup Provider Selector
 *
 * Dropdown that lets users switch between configured AI providers
 * directly from the popup. Only visible when 2+ providers have keys saved.
 *
 * Exported as standalone functions so the module is testable without
 * booting the full popup.
 */

import { PROVIDERS, loadConfig } from '../shared/config-loader.js';
import { getActiveModelId } from './model-selector.js';

/** Friendly display names for the provider enum values. */
const DISPLAY_NAMES = {
  [PROVIDERS.OPENROUTER]: 'OpenRouter',
  [PROVIDERS.GEMINI]: 'Google Gemini',
  [PROVIDERS.GROK]: 'Grok (xAI)',
};

/** Maps provider name → config property that holds its key. */
const CONFIG_KEY_MAP = {
  [PROVIDERS.OPENROUTER]: 'openrouterApiKey',
  [PROVIDERS.GEMINI]: 'geminiApiKey',
  [PROVIDERS.GROK]: 'grokApiKey',
};

/**
 * Returns the list of providers that have a key stored.
 *
 * @returns {Promise<string[]>}
 */
export async function getConfiguredProviders() {
  const config = await loadConfig();
  return Object.entries(CONFIG_KEY_MAP)
    .filter(([_provider, configKey]) => !!config[configKey])
    .map(([provider]) => provider);
}

/**
 * Populate and show/hide the provider selector dropdown in the popup.
 *
 * Expects the DOM to have:
 *   #provider-selector-wrapper (div) — shown/hidden
 *   #provider-selector          (select) — populated with <option>s
 *
 * @returns {Promise<void>}
 */
export async function buildProviderSelector() {
  const wrapper = document.getElementById('provider-selector-wrapper');
  const select = document.getElementById('provider-selector');
  if (!wrapper || !select) return;

  const configured = await getConfiguredProviders();
  const config = await loadConfig();

  // Only show when 2+ providers configured
  if (configured.length < 2) {
    wrapper.style.display = 'none';
    return;
  }

  // Build options with model name inline
  select.innerHTML = '';
  for (const provider of configured) {
    const option = document.createElement('option');
    option.value = provider;

    // Show "Provider Name · model-id" for context
    const displayName = DISPLAY_NAMES[provider] || provider;
    const modelId = await getActiveModelId(provider);
    const shortModel = modelId.includes('/') ? modelId.split('/').pop() : modelId;
    option.textContent = `${displayName} · ${shortModel}`;

    if (provider === config.activeProvider) {
      option.selected = true;
    }
    select.appendChild(option);
  }

  // Show the wrapper
  wrapper.style.display = '';

  // Wire change handler (idempotent — remove old first)
  select.onchange = async () => {
    await chrome.storage.local.set({ activeProvider: select.value });
  };
}
