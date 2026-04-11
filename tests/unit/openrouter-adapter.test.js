/**
 * WS-05 — OpenRouter Adapter Unit Tests (RED phase)
 *
 * Tests the API adapter that makes real calls to OpenRouter.
 * All tests use vi.fn() to mock fetch — no real network calls.
 */
import { callOpenRouter } from '../../src/providers/adapters/openrouter.js';
import { PROVIDER_DEFAULTS } from '../../src/shared/constants.js';

describe('OpenRouter Adapter', () => {

  const validParams = {
    messages: [
      { role: 'system', content: 'You are a credibility reviewer.' },
      { role: 'user', content: 'Analyze this content...' }
    ],
    apiKey: 'sk-or-v1-test-key-123'
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('makes a POST request to the OpenRouter API URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        choices: [{ message: { content: '{"summary":"test"}' } }]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    await callOpenRouter(validParams);

    expect(mockFetch).toHaveBeenCalledWith(
      PROVIDER_DEFAULTS.OPENROUTER_API_URL,
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

    await callOpenRouter(validParams);

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.headers['Authorization']).toBe('Bearer sk-or-v1-test-key-123');
  });

  it('includes HTTP-Referer and X-Title headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        choices: [{ message: { content: '{}' } }]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    await callOpenRouter(validParams);

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.headers['HTTP-Referer']).toBeDefined();
    expect(callArgs.headers['X-Title']).toBe('BS Detector');
  });

  it('sends messages in OpenAI-compatible format', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        choices: [{ message: { content: '{}' } }]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    await callOpenRouter(validParams);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages).toEqual(validParams.messages);
    expect(body.model).toBeDefined();
  });

  it('requests JSON response format', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        choices: [{ message: { content: '{}' } }]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    await callOpenRouter(validParams);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('returns parsed response content on success (200)', async () => {
    const responseContent = '{"summary":"Well-sourced article","bs_score":{"score":22}}';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        choices: [{ message: { content: responseContent } }]
      })
    }));

    const result = await callOpenRouter(validParams);

    expect(result.success).toBe(true);
    expect(result.content).toBe(responseContent);
  });

  it('returns invalid_key error on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { message: 'Invalid API key' } })
    }));

    const result = await callOpenRouter(validParams);

    expect(result.success).toBe(false);
    expect(result.error).toBe('invalid_key');
  });

  it('returns rate_limited error on 429', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: { message: 'Rate limited' } })
    }));

    const result = await callOpenRouter(validParams);

    expect(result.success).toBe(false);
    expect(result.error).toBe('rate_limited');
  });

  it('returns provider_error on 500', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: { message: 'Internal error' } })
    }));

    const result = await callOpenRouter(validParams);

    expect(result.success).toBe(false);
    expect(result.error).toBe('provider_error');
  });

  it('returns timeout error when fetch throws AbortError', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    const result = await callOpenRouter(validParams);

    expect(result.success).toBe(false);
    expect(result.error).toBe('timeout');
  });

  it('returns network_error when fetch throws generic error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    const result = await callOpenRouter(validParams);

    expect(result.success).toBe(false);
    expect(result.error).toBe('network_error');
  });
});
