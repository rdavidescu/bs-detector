/**
 * BS Detector — Config Loader
 *
 * Loads and validates the OpenRouter API key.
 * Walking skeleton: key stored in chrome.storage.local.
 * Future: onboarding UI will handle key entry.
 */

const PLACEHOLDER_PATTERNS = ['YOUR-KEY-HERE', 'your-key-here', 'PLACEHOLDER', 'xxx'];

/**
 * Validate a config object has a usable API key.
 *
 * @param {object} config - Config object to validate
 * @returns {{ valid: boolean, errors: string[] }}
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

  // Check for placeholder values
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (key.includes(pattern)) {
      errors.push('OPENROUTER_API_KEY contains placeholder value');
      return { valid: false, errors };
    }
  }

  return { valid: true, errors: [] };
}

/**
 * Load config from chrome.storage.local.
 *
 * @returns {Promise<{ OPENROUTER_API_KEY: string }>}
 * @throws {Error} If no valid key is stored
 */
export async function loadConfig() {
  const result = await chrome.storage.local.get(['apiKey']);

  if (!result.apiKey) {
    throw new Error('API key not configured — add your OpenRouter key in settings');
  }

  const config = { OPENROUTER_API_KEY: result.apiKey };
  const validation = validateConfig(config);

  if (!validation.valid) {
    throw new Error(validation.errors.join('; '));
  }

  return config;
}
