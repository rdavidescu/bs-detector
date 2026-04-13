/**
 * Adapter Factory — Unit Tests (TDD)
 *
 * The factory picks the right adapter function based on provider name.
 */
import { getAdapter, callProvider } from '../../src/providers/adapter-factory.js';
import { PROVIDERS } from '../../src/shared/config-loader.js';

describe('Adapter Factory', () => {

  describe('getAdapter', () => {
    it('returns a function for openrouter', () => {
      const adapter = getAdapter(PROVIDERS.OPENROUTER);
      expect(typeof adapter).toBe('function');
    });

    it('returns a function for gemini', () => {
      const adapter = getAdapter(PROVIDERS.GEMINI);
      expect(typeof adapter).toBe('function');
    });

    it('returns a function for grok', () => {
      const adapter = getAdapter(PROVIDERS.GROK);
      expect(typeof adapter).toBe('function');
    });

    it('throws for unknown provider', () => {
      expect(() => getAdapter('chatgpt')).toThrow(/unknown provider/i);
    });
  });

  describe('callProvider', () => {
    const messages = [
      { role: 'system', content: 'Test system prompt' },
      { role: 'user', content: 'Test content' }
    ];

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('calls the correct adapter for openrouter and returns result', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          choices: [{ message: { content: '{"test":true}' } }]
        })
      }));

      const result = await callProvider({
        provider: PROVIDERS.OPENROUTER,
        messages,
        apiKey: 'sk-or-test'
      });

      expect(result.success).toBe(true);
      expect(result.content).toBe('{"test":true}');
    });

    it('calls the correct adapter for gemini and returns result', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{ text: '{"test":true}' }] } }]
        })
      }));

      const result = await callProvider({
        provider: PROVIDERS.GEMINI,
        messages,
        apiKey: 'AIzaTest'
      });

      expect(result.success).toBe(true);
      expect(result.content).toBe('{"test":true}');
    });

    it('calls the correct adapter for grok and returns result', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          choices: [{ message: { content: '{"test":true}' } }]
        })
      }));

      const result = await callProvider({
        provider: PROVIDERS.GROK,
        messages,
        apiKey: 'xai-test'
      });

      expect(result.success).toBe(true);
      expect(result.content).toBe('{"test":true}');
    });
  });
});
