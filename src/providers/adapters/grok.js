/**
 * BS Detector — Grok (xAI) API Adapter
 *
 * Grok uses an OpenAI-compatible API at api.x.ai.
 * Same message format, same response format, just different endpoint.
 */

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const DEFAULT_MODEL = 'grok-3-mini';
const DEFAULT_TIMEOUT_MS = 30000;

function classifyError(status) {
  if (status === 401 || status === 403) return 'invalid_key';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'provider_error';
  return 'api_error';
}

/**
 * Call the Grok chat completions API.
 *
 * @param {{
 *   messages: Array<{ role: string, content: string }>,
 *   apiKey: string,
 *   model?: string,
 *   timeoutMs?: number
 * }} params
 * @returns {Promise<{ success: boolean, content?: string, error?: string, status?: number, message?: string }>}
 */
export async function callGrok(params) {
  const {
    messages,
    apiKey,
    model = DEFAULT_MODEL,
    timeoutMs = DEFAULT_TIMEOUT_MS
  } = params;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return {
        success: false,
        error: classifyError(response.status),
        status: response.status,
        message: errorBody.error?.message || `HTTP ${response.status}`
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return { success: true, content };

  } catch (err) {
    clearTimeout(timeout);

    if (err.name === 'AbortError') {
      return { success: false, error: 'timeout', message: 'Request timed out' };
    }

    return {
      success: false,
      error: 'network_error',
      message: err.message || 'Unknown network error'
    };
  }
}
