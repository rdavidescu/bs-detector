/**
 * WS-03 — Config Loader Unit Tests (RED phase — written before implementation)
 *
 * Tests the config loading and validation logic.
 * For the walking skeleton, API key comes from a config file (no UI).
 */
import { validateConfig, loadConfig } from '../../src/shared/config-loader.js';

describe('Config Loader', () => {

  describe('validateConfig()', () => {

    it('accepts valid config with OpenRouter API key', () => {
      const config = { OPENROUTER_API_KEY: 'sk-or-v1-abc123def456' };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects config with missing API key', () => {
      const config = {};
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OPENROUTER_API_KEY is required');
    });

    it('rejects config with empty string API key', () => {
      const config = { OPENROUTER_API_KEY: '' };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OPENROUTER_API_KEY cannot be empty');
    });

    it('rejects config with placeholder API key', () => {
      const config = { OPENROUTER_API_KEY: 'sk-or-v1-YOUR-KEY-HERE' };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OPENROUTER_API_KEY contains placeholder value');
    });

    it('rejects config with non-string API key', () => {
      const config = { OPENROUTER_API_KEY: 12345 };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OPENROUTER_API_KEY must be a string');
    });

    it('rejects null config', () => {
      const result = validateConfig(null);
      expect(result.valid).toBe(false);
    });

    it('rejects undefined config', () => {
      const result = validateConfig(undefined);
      expect(result.valid).toBe(false);
    });

    it('accepts key with sk-or- prefix', () => {
      const config = { OPENROUTER_API_KEY: 'sk-or-v1-realkey123' };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('loadConfig()', () => {

    beforeEach(() => {
      // Reset chrome storage mock
      vi.clearAllMocks();
    });

    it('returns config from chrome.storage.local', async () => {
      chrome.storage.local.get.mockImplementation((_keys, callback) => {
        if (callback) callback({ apiKey: 'sk-or-v1-stored-key-123' });
        return Promise.resolve({ apiKey: 'sk-or-v1-stored-key-123' });
      });

      const config = await loadConfig();
      expect(config.OPENROUTER_API_KEY).toBe('sk-or-v1-stored-key-123');
    });

    it('throws descriptive error when no key is stored', async () => {
      chrome.storage.local.get.mockImplementation((_keys, callback) => {
        if (callback) callback({});
        return Promise.resolve({});
      });

      await expect(loadConfig()).rejects.toThrow('API key not configured');
    });

    it('throws when stored key is invalid', async () => {
      chrome.storage.local.get.mockImplementation((_keys, callback) => {
        if (callback) callback({ apiKey: '' });
        return Promise.resolve({ apiKey: '' });
      });

      await expect(loadConfig()).rejects.toThrow();
    });
  });
});
