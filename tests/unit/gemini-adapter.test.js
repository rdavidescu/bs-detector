/**
 * Gemini Adapter — Unit Tests (TDD)
 *
 * Google Gemini uses a DIFFERENT API format from OpenAI:
 * - Auth via ?key= query param (not Bearer header)
 * - Messages are { role, parts: [{ text }] } (not { role, content })
 * - Response is { candidates: [{ content: { parts: [{ text }] } }] }
 * - Endpoint: generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 */
import { callGemini } from '../../src/providers/adapters/gemini.js';

describe('Gemini Adapter', () => {

  const validParams = {
    messages: [
      { role: 'system', content: 'You are a credibility reviewer.' },
      { role: 'user', content: 'Analyze this content...' }
    ],
    apiKey: 'AIzaTestKey123'
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the Gemini generateContent endpoint with key in URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: '{"summary":"test"}' }] } }]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    await callGemini(validParams);

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('generativelanguage.googleapis.com');
    expect(url).toContain('key=AIzaTestKey123');
    expect(url).toContain(':generateContent');
  });

  it('uses gemini-2.0-flash as default model', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: '{}' }] } }]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    await callGemini(validParams);

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('models/gemini-2.5-flash');
  });

  it('converts OpenAI messages to Gemini format with system instruction', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: '{}' }] } }]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    await callGemini(validParams);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    // System message should be extracted as systemInstruction
    expect(body.systemInstruction).toEqual({
      parts: [{ text: 'You are a credibility reviewer.' }]
    });
    // User message should be in contents array
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'Analyze this content...' }] }
    ]);
  });

  it('requests JSON response via responseMimeType', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: '{}' }] } }]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    await callGemini(validParams);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('extracts text from Gemini response format on success', async () => {
    const responseText = '{"summary":"Clean article","bs_score":{"score":10}}';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: responseText }] } }]
      })
    }));

    const result = await callGemini(validParams);

    expect(result.success).toBe(true);
    expect(result.content).toBe(responseText);
  });

  it('returns invalid_key error on 400 with API_KEY_INVALID', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({
        error: { message: 'API key not valid.', status: 'INVALID_ARGUMENT' }
      })
    }));

    const result = await callGemini(validParams);
    expect(result.success).toBe(false);
    expect(result.error).toBe('invalid_key');
  });

  it('returns invalid_key on 403', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({
        error: { message: 'Forbidden' }
      })
    }));

    const result = await callGemini(validParams);
    expect(result.success).toBe(false);
    expect(result.error).toBe('invalid_key');
  });

  it('returns rate_limited error on 429', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({
        error: { message: 'Resource exhausted' }
      })
    }));

    const result = await callGemini(validParams);
    expect(result.success).toBe(false);
    expect(result.error).toBe('rate_limited');
  });

  it('returns timeout error on AbortError', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    const result = await callGemini(validParams);
    expect(result.success).toBe(false);
    expect(result.error).toBe('timeout');
  });

  it('returns network_error on generic failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const result = await callGemini(validParams);
    expect(result.success).toBe(false);
    expect(result.error).toBe('network_error');
  });

  it('handles missing candidates gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ candidates: [] })
    }));

    const result = await callGemini(validParams);
    expect(result.success).toBe(true);
    expect(result.content).toBe('');
  });

  it('allows overriding the model', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: '{}' }] } }]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    await callGemini({ ...validParams, model: 'gemini-2.5-pro-preview-05-06' });

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('models/gemini-2.5-pro-preview-05-06');
  });
});
