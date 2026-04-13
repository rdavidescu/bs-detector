/**
 * MP-01 — Config Loader Unit Tests (TDD — RED phase)
 *
 * Tests multi-provider config loading, validation, and migration.
 * Backward compatible with existing OpenRouter-only setup.
 */
import {
  validateApiKey,
  getActiveProvider,
  getActiveApiKey,
  loadConfig,
  migrateOldConfig,
  PROVIDERS
} from '../../src/shared/config-loader.js';

describe('Config Loader — Multi-Provider', () => {

  describe('PROVIDERS enum', () => {

    it('exports OPENROUTER, GEMINI, and GROK provider names', () => {
      expect(PROVIDERS.OPENROUTER).toBe('openrouter');
      expect(PROVIDERS.GEMINI).toBe('gemini');
      expect(PROVIDERS.GROK).toBe('grok');
    });
  });

  describe('validateApiKey()', () => {

    // OpenRouter keys
    it('accepts valid OpenRouter key (sk-or- prefix)', () => {
      expect(validateApiKey('sk-or-v1-abc123def456', 'openrouter')).toEqual({ valid: true, error: null });
    });

    it('rejects empty string for any provider', () => {
      const result = validateApiKey('', 'openrouter');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('rejects null/undefined key', () => {
      expect(validateApiKey(null, 'openrouter').valid).toBe(false);
      expect(validateApiKey(undefined, 'gemini').valid).toBe(false);
    });

    it('rejects non-string key', () => {
      expect(validateApiKey(12345, 'openrouter').valid).toBe(false);
    });

    it('rejects placeholder values', () => {
      expect(validateApiKey('sk-or-v1-YOUR-KEY-HERE', 'openrouter').valid).toBe(false);
      expect(validateApiKey('AIzaYOUR-KEY-HERE', 'gemini').valid).toBe(false);
    });

    // Gemini keys
    it('accepts valid Gemini key (AIza prefix)', () => {
      expect(validateApiKey('AIzaSyD_abc123def456', 'gemini')).toEqual({ valid: true, error: null });
    });

    it('warns when Gemini key does not start with AIza', () => {
      const result = validateApiKey('not-a-gemini-key', 'gemini');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('AIza');
    });

    // Grok keys
    it('accepts valid Grok key (xai- prefix)', () => {
      expect(validateApiKey('xai-abc123def456', 'grok')).toEqual({ valid: true, error: null });
    });

    it('warns when Grok key does not start with xai-', () => {
      const result = validateApiKey('not-a-grok-key', 'grok');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('xai-');
    });

    // OpenRouter prefix check
    it('warns when OpenRouter key does not start with sk-or-', () => {
      const result = validateApiKey('not-an-openrouter-key', 'openrouter');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('sk-or-');
    });

    // Unknown provider
    it('accepts any non-empty key for unknown provider', () => {
      expect(validateApiKey('some-key-123', 'unknown_provider')).toEqual({ valid: true, error: null });
    });
  });

  describe('getActiveProvider()', () => {

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns stored active provider', async () => {
      chrome.storage.local.get.mockImplementation((_keys, callback) => {
        const result = { activeProvider: 'gemini' };
        if (callback) callback(result);
        return Promise.resolve(result);
      });

      const provider = await getActiveProvider();
      expect(provider).toBe('gemini');
    });

    it('defaults to openrouter when none set', async () => {
      chrome.storage.local.get.mockImplementation((_keys, callback) => {
        const result = {};
        if (callback) callback(result);
        return Promise.resolve(result);
      });

      const provider = await getActiveProvider();
      expect(provider).toBe('openrouter');
    });
  });

  describe('getActiveApiKey()', () => {

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns OpenRouter key when openrouter is active', async () => {
      chrome.storage.local.get.mockImplementation((_keys, callback) => {
        const result = { activeProvider: 'openrouter', openrouterApiKey: 'sk-or-v1-test123' };
        if (callback) callback(result);
        return Promise.resolve(result);
      });

      const key = await getActiveApiKey();
      expect(key).toBe('sk-or-v1-test123');
    });

    it('returns Gemini key when gemini is active', async () => {
      chrome.storage.local.get.mockImplementation((_keys, callback) => {
        const result = { activeProvider: 'gemini', geminiApiKey: 'AIzaSyD_test456' };
        if (callback) callback(result);
        return Promise.resolve(result);
      });

      const key = await getActiveApiKey();
      expect(key).toBe('AIzaSyD_test456');
    });

    it('returns Grok key when grok is active', async () => {
      chrome.storage.local.get.mockImplementation((_keys, callback) => {
        const result = { activeProvider: 'grok', grokApiKey: 'xai-test789' };
        if (callback) callback(result);
        return Promise.resolve(result);
      });

      const key = await getActiveApiKey();
      expect(key).toBe('xai-test789');
    });

    it('returns null when active provider has no key', async () => {
      chrome.storage.local.get.mockImplementation((_keys, callback) => {
        const result = { activeProvider: 'gemini' };
        if (callback) callback(result);
        return Promise.resolve(result);
      });

      const key = await getActiveApiKey();
      expect(key).toBeNull();
    });
  });

  describe('loadConfig()', () => {

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns full config with all provider keys and active provider', async () => {
      chrome.storage.local.get.mockImplementation((_keys, callback) => {
        const result = {
          activeProvider: 'openrouter',
          openrouterApiKey: 'sk-or-v1-abc',
          geminiApiKey: 'AIzaSyD_def',
          grokApiKey: 'xai-ghi'
        };
        if (callback) callback(result);
        return Promise.resolve(result);
      });

      const config = await loadConfig();
      expect(config.activeProvider).toBe('openrouter');
      expect(config.openrouterApiKey).toBe('sk-or-v1-abc');
      expect(config.geminiApiKey).toBe('AIzaSyD_def');
      expect(config.grokApiKey).toBe('xai-ghi');
    });

    it('returns safe defaults when storage is empty', async () => {
      chrome.storage.local.get.mockImplementation((_keys, callback) => {
        const result = {};
        if (callback) callback(result);
        return Promise.resolve(result);
      });

      const config = await loadConfig();
      expect(config.activeProvider).toBe('openrouter');
      expect(config.openrouterApiKey).toBeNull();
      expect(config.geminiApiKey).toBeNull();
      expect(config.grokApiKey).toBeNull();
    });
  });

  describe('migrateOldConfig()', () => {

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('migrates old apiKey to openrouterApiKey', async () => {
      chrome.storage.local.get.mockImplementation((_keys, callback) => {
        const result = { apiKey: 'sk-or-v1-old-key-123' };
        if (callback) callback(result);
        return Promise.resolve(result);
      });

      await migrateOldConfig();

      // Should have called set with new key format
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          openrouterApiKey: 'sk-or-v1-old-key-123',
          activeProvider: 'openrouter'
        })
      );
      // Should remove old key
      expect(chrome.storage.local.remove).toHaveBeenCalledWith(['apiKey']);
    });

    it('does nothing when no old apiKey exists', async () => {
      chrome.storage.local.get.mockImplementation((_keys, callback) => {
        const result = {};
        if (callback) callback(result);
        return Promise.resolve(result);
      });

      await migrateOldConfig();

      expect(chrome.storage.local.set).not.toHaveBeenCalled();
      expect(chrome.storage.local.remove).not.toHaveBeenCalled();
    });

    it('does not overwrite existing openrouterApiKey during migration', async () => {
      chrome.storage.local.get.mockImplementation((_keys, callback) => {
        const result = { apiKey: 'sk-or-v1-old', openrouterApiKey: 'sk-or-v1-already-set' };
        if (callback) callback(result);
        return Promise.resolve(result);
      });

      await migrateOldConfig();

      // Should NOT overwrite the existing key
      if (chrome.storage.local.set.mock.calls.length > 0) {
        const setArgs = chrome.storage.local.set.mock.calls[0][0];
        expect(setArgs.openrouterApiKey).not.toBe('sk-or-v1-old');
      }
    });
  });
});
