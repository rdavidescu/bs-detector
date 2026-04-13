/**
 * BS Detector — Multi-Provider Config Loader
 *
 * Loads, validates, and manages API keys for multiple AI providers.
 * Supports OpenRouter, Google Gemini, and Grok (xAI).
 * Keys stored in chrome.storage.local.
 *
 * Backward compatible: migrates old single-key `apiKey` format
 * to the new `openrouterApiKey` + `activeProvider` format.
 */

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

export const PROVIDERS = Object.freeze({
  OPENROUTER: 'openrouter',
  GEMINI: 'gemini',
  GROK: 'grok',
});

/**
 * Maps provider name → storage key for that provider's API key.
 */
const PROVIDER_KEY_MAP = {
  [PROVIDERS.OPENROUTER]: 'openrouterApiKey',
  [PROVIDERS.GEMINI]: 'geminiApiKey',
  [PROVIDERS.GROK]: 'grokApiKey',
};

/**
 * Expected key prefix per provider (used for soft validation).
 */
const PREFIX_MAP = {
  [PROVIDERS.OPENROUTER]: 'sk-or-',
  [PROVIDERS.GEMINI]: 'AIza',
  [PROVIDERS.GROK]: 'xai-',
};

const PLACEHOLDER_PATTERNS = ['YOUR-KEY-HERE', 'your-key-here', 'PLACEHOLDER', 'xxx'];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate an API key for a given provider.
 *
 * @param {*} key   - The API key to validate
 * @param {string} provider - Provider name (e.g. 'openrouter')
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateApiKey(key, provider) {
  // Must be a non-empty string
  if (key === null || key === undefined || typeof key !== 'string') {
    return { valid: false, error: 'API key must be a non-empty string' };
  }

  if (key.trim() === '') {
    return { valid: false, error: 'API key cannot be empty' };
  }

  // Reject placeholder values
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (key.includes(pattern)) {
      return { valid: false, error: 'API key contains a placeholder value' };
    }
  }

  // Provider-specific prefix check (known providers only)
  const expectedPrefix = PREFIX_MAP[provider];
  if (expectedPrefix && !key.startsWith(expectedPrefix)) {
    return { valid: false, error: `Key for ${provider} should start with ${expectedPrefix}` };
  }

  return { valid: true, error: null };
}

// ---------------------------------------------------------------------------
// Storage helpers (all async, use chrome.storage.local)
// ---------------------------------------------------------------------------

/**
 * Get the currently active provider.
 * Defaults to 'openrouter' when nothing is stored.
 *
 * @returns {Promise<string>}
 */
export async function getActiveProvider() {
  const result = await chrome.storage.local.get(['activeProvider']);
  return result.activeProvider || PROVIDERS.OPENROUTER;
}

/**
 * Get the API key for the currently active provider.
 *
 * @returns {Promise<string|null>}
 */
export async function getActiveApiKey() {
  const storageKeys = ['activeProvider', ...Object.values(PROVIDER_KEY_MAP)];
  const result = await chrome.storage.local.get(storageKeys);

  const provider = result.activeProvider || PROVIDERS.OPENROUTER;
  const keyField = PROVIDER_KEY_MAP[provider];

  return keyField ? (result[keyField] || null) : null;
}

/**
 * Load the full multi-provider config from storage.
 *
 * @returns {Promise<{ activeProvider: string, openrouterApiKey: string|null, geminiApiKey: string|null, grokApiKey: string|null }>}
 */
export async function loadConfig() {
  const storageKeys = ['activeProvider', ...Object.values(PROVIDER_KEY_MAP)];
  const result = await chrome.storage.local.get(storageKeys);

  return {
    activeProvider: result.activeProvider || PROVIDERS.OPENROUTER,
    openrouterApiKey: result.openrouterApiKey || null,
    geminiApiKey: result.geminiApiKey || null,
    grokApiKey: result.grokApiKey || null,
  };
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

/**
 * Migrate the old single-key format (`apiKey`) to the new multi-provider
 * format (`openrouterApiKey` + `activeProvider`).
 *
 * Safe to call multiple times — skips if no old key exists or if the new
 * key is already populated.
 *
 * @returns {Promise<void>}
 */
export async function migrateOldConfig() {
  const result = await chrome.storage.local.get(['apiKey', 'openrouterApiKey']);

  if (!result.apiKey) {
    // Nothing to migrate
    return;
  }

  if (result.openrouterApiKey) {
    // New key already exists — just clean up the old one
    await chrome.storage.local.remove(['apiKey']);
    return;
  }

  // Migrate: copy old key → new slot, set active provider, remove old key
  await chrome.storage.local.set({
    openrouterApiKey: result.apiKey,
    activeProvider: PROVIDERS.OPENROUTER,
  });
  await chrome.storage.local.remove(['apiKey']);
}

// ---------------------------------------------------------------------------
// Legacy compat — validateConfig (used by service-worker)
// ---------------------------------------------------------------------------

/**
 * @deprecated Use validateApiKey() instead.
 * Kept for backward compatibility with the walking-skeleton service worker.
 */
export function validateConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Config must be a non-null object'] };
  }

  if (!('OPENROUTER_API_KEY' in config)) {
    errors.push('OPENROUTER_API_KEY is required');
    return { valid: false, errors };
  }

  const key = config.OPENROUTER_API_KEY;

  if (typeof key !== 'string') {
    errors.push('OPENROUTER_API_KEY must be a string');
    return { valid: false, errors };
  }

  if (key.trim() === '') {
    errors.push('OPENROUTER_API_KEY cannot be empty');
    return { valid: false, errors };
  }

  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (key.includes(pattern)) {
      errors.push('OPENROUTER_API_KEY contains placeholder value');
      return { valid: false, errors };
    }
  }

  return { valid: true, errors: [] };
}
