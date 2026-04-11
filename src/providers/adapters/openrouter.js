/**
 * BS Detector — OpenRouter API Adapter
 *
 * Makes real API calls to OpenRouter's chat completions endpoint.
 * OpenAI-compatible format, JSON mode enabled.
 */
import { PROVIDER_DEFAULTS } from '../../shared/constants.js';

/**
 * Map HTTP status codes to error types.
 */
function classifyError(status) {
  if (status === 401 || status === 403) return 'invalid_key';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'provider_error';
  return 'api_error';
}

/**
 * Call the OpenRouter chat completions API.
 *
 * @param {{
 *   messages: Array<{ role: string, content: string }>,
 *   apiKey: string,
 *   model?: string,
 *   timeoutMs?: number
 * }} params
 * @returns {Promise<{
 *   success: boolean,
 *   content?: string,
 *   error?: string,
 *   status?: number,
 *   message?: string
 * }>}
 */
export async function callOpenRouter(params) {
  const {
    messages,
    apiKey,
    model = PROVIDER_DEFAULTS.OPENROUTER_FREE_MODEL,
    timeoutMs = PROVIDER_DEFAULTS.REQUEST_TIMEOUT_MS
  } = params;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(PROVIDER_DEFAULTS.OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/rdavidescu/bs-detector',
        'X-Title': 'BS Detector'
      },
      body: JSON.stringify({
        model,
        messages,
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

    return {
      success: true,
      content
    };

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
