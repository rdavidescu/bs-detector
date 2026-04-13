/**
 * BS Detector — Google Gemini API Adapter
 *
 * Gemini is NOT OpenAI-compatible. Key differences:
 *   - Auth: API key as ?key= query param (no Bearer header)
 *   - Messages: { role, parts: [{ text }] } (not { role, content })
 *   - System prompt: separate systemInstruction field
 *   - JSON mode: generationConfig.responseMimeType = 'application/json'
 *   - Response: candidates[0].content.parts[0].text
 *   - Endpoint: generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 */

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_TIMEOUT_MS = 30000;

function classifyError(status) {
  if (status === 400 || status === 401 || status === 403) return 'invalid_key';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'provider_error';
  return 'api_error';
}

/**
 * Convert OpenAI-style messages to Gemini format.
 * Extracts system messages into systemInstruction and converts the rest.
 *
 * @param {Array<{ role: string, content: string }>} messages
 * @returns {{ systemInstruction?: object, contents: Array }}
 */
function convertMessages(messages) {
  let systemInstruction;
  const contents = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      // Gemini uses a separate systemInstruction field
      systemInstruction = { parts: [{ text: msg.content }] };
    } else {
      // Map 'assistant' → 'model' for Gemini
      const role = msg.role === 'assistant' ? 'model' : msg.role;
      contents.push({
        role,
        parts: [{ text: msg.content }]
      });
    }
  }

  return { systemInstruction, contents };
}

/**
 * Call the Gemini generateContent API.
 *
 * @param {{
 *   messages: Array<{ role: string, content: string }>,
 *   apiKey: string,
 *   model?: string,
 *   timeoutMs?: number
 * }} params
 * @returns {Promise<{ success: boolean, content?: string, error?: string, status?: number, message?: string }>}
 */
export async function callGemini(params) {
  const {
    messages,
    apiKey,
    model = DEFAULT_MODEL,
    timeoutMs = DEFAULT_TIMEOUT_MS
  } = params;

  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;
  const { systemInstruction, contents } = convertMessages(messages);

  const requestBody = {
    contents,
    generationConfig: {
      responseMimeType: 'application/json',
      // Note: temperature intentionally omitted for Gemini — temp 0 caused
      // overly lenient scoring (BS=4 on articles that OpenRouter/Grok scored 24-31).
      // Letting Gemini use its default temperature for now as an experiment.
    }
  };

  // Only include systemInstruction if we have one
  if (systemInstruction) {
    requestBody.systemInstruction = systemInstruction;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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

    // Gemini response: candidates[0].content.parts[0].text
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return { success: true, content: text };

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
