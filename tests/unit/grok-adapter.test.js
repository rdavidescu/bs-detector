/**
 * Grok (xAI) Adapter — Unit Tests (TDD)
 *
 * Grok uses an OpenAI-compatible API at api.x.ai.
 * Tests mirror the OpenRouter adapter pattern but with Grok-specific details.
 */
import { callGrok } from '../../src/providers/adapters/grok.js';

describe('Grok Adapter', () => {

  const validParams = {
    messages: [
      { role: 'system', content: 'You are a credibility reviewer.' },
      { role: 'user', content: 'Analyze this content...' }
    ],
    apiKey: 'xai-test-key-123'
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('makes a POST request to the xAI API endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        choices: [{ message: { content: '{"summary":"test"}' } }]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    await callGrok(validParams);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.x.ai/v1/chat/completions',
      expect.any(Object)
    );
  });

  it('includes Authorization header with Bearer token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        choices: [{ message: { content: '{}' } }]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    await callGrok(validParams);

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.headers['Authorization']).toBe('Bearer xai-test-key-123');
  });

  it('uses grok-3-mini as default model', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        choices: [{ message: { content: '{}' } }]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    await callGrok(validParams);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('grok-3-mini');
  });

  it('sends messages in OpenAI-compatible format with JSON response_format', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        choices: [{ message: { content: '{}' } }]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    await callGrok(validParams);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages).toEqual(validParams.messages);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('returns parsed content on success', async () => {
    const responseContent = '{"summary":"Good article","bs_score":{"score":15}}';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        choices: [{ message: { content: responseContent } }]
      })
    }));

    const result = await callGrok(validParams);

    expect(result.success).toBe(true);
    expect(result.content).toBe(responseContent);
  });

  it('returns invalid_key error on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { message: 'Unauthorized' } })
    }));

    const result = await callGrok(validParams);
    expect(result.success).toBe(false);
    expect(result.error).toBe('invalid_key');
  });

  it('returns rate_limited error on 429', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: { message: 'Rate limited' } })
    }));

    const result = await callGrok(validParams);
    expect(result.success).toBe(false);
    expect(result.error).toBe('rate_limited');
  });

  it('returns timeout error on AbortError', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    const result = await callGrok(validParams);
    expect(result.success).toBe(false);
    expect(result.error).toBe('timeout');
  });

  it('returns network_error on generic fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')));

    const result = await callGrok(validParams);
    expect(result.success).toBe(false);
    expect(result.error).toBe('network_error');
  });

  it('allows overriding the model', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        choices: [{ message: { content: '{}' } }]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    await callGrok({ ...validParams, model: 'grok-3' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('grok-3');
  });
});
