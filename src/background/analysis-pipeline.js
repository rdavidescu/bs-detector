/**
 * BS Detector — Analysis Pipeline
 *
 * Orchestrates the full analysis chain:
 * content extraction -> prompt building -> API call -> response parsing -> scoring
 *
 * Called by the service worker when TRIGGER_ANALYSIS is received.
 */
import { buildPrompt } from '../prompts/prompt-engine.js';
import { callProvider } from '../providers/adapter-factory.js';
import { parseResponse } from '../shared/response-parser.js';
import { calculateBSScore, getScoreBand } from '../shared/score-calculator.js';
import { ANALYSIS_MODES, UI_STATES, MESSAGE_TYPES, PROVIDER_DEFAULTS } from '../shared/constants.js';

/** Errors worth retrying (transient server issues). */
const RETRYABLE_ERRORS = new Set(['provider_error', 'rate_limited', 'timeout']);

/**
 * Call provider with retry for transient errors (503, 429, timeout).
 * Simple exponential backoff: 1s → 2s.
 */
async function callWithRetry(params) {
  const maxRetries = PROVIDER_DEFAULTS.MAX_RETRIES;
  let lastResult;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastResult = await callProvider(params);

    if (lastResult.success || !RETRYABLE_ERRORS.has(lastResult.error)) {
      return lastResult;
    }

    // Wait before retry (1s, 2s, ...)
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  return lastResult;
}

/**
 * Run the full analysis pipeline.
 *
 * @param {{
 *   tabId: number,
 *   apiKey: string,
 *   provider: string,
 *   model?: string,
 *   onStateChange: (state: string) => void
 * }} params
 * @returns {Promise<{ success: boolean, result?: object, error?: string }>}
 */
export async function runAnalysis({ tabId, apiKey, provider, model, onStateChange }) {

  // Step 1: Extract content from the active tab
  onStateChange(UI_STATES.EXTRACTING);

  let extraction;
  try {
    extraction = await chrome.tabs.sendMessage(tabId, {
      type: MESSAGE_TYPES.EXTRACT_CONTENT
    });
  } catch (err) {
    return {
      success: false,
      error: `Content extraction failed: ${err.message}. Try refreshing the page.`
    };
  }

  if (extraction.error) {
    return { success: false, error: extraction.error };
  }

  // Step 2: Build prompt
  onStateChange(UI_STATES.ANALYZING);

  let prompt;
  try {
    prompt = buildPrompt({
      mode: ANALYSIS_MODES.QUICK,
      title: extraction.title || '',
      url: extraction.url || '',
      content: extraction.content,
      contentType: extraction.contentType || 'unknown'
    });
  } catch (err) {
    return { success: false, error: `Prompt build failed: ${err.message}` };
  }

  // Step 3: Call the active provider (with retry for transient errors)
  const apiResult = await callWithRetry({
    provider,
    messages: prompt.messages,
    apiKey,
    model
  });

  if (!apiResult.success) {
    const providerLabel = (provider || 'provider').charAt(0).toUpperCase() + (provider || 'provider').slice(1);
    const errorMessages = {
      invalid_key: `Invalid API key. Check your ${providerLabel} key in settings.`,
      rate_limited: 'Rate limited. Try again later or switch provider.',
      timeout: 'Request timed out. The AI model may be busy.',
      network_error: 'Network error. Check your internet connection.',
      provider_error: `${providerLabel} server error. Try again in a moment.`
    };
    return {
      success: false,
      error: errorMessages[apiResult.error] || `API error: ${apiResult.message || apiResult.error}`
    };
  }

  // Step 4: Parse response
  const parsed = parseResponse(apiResult.content);

  if (!parsed.success) {
    return { success: false, error: `Could not parse AI response: ${parsed.error}` };
  }

  // Step 5: Calculate final score and band
  const bsScore = calculateBSScore(parsed.data.components);
  const band = getScoreBand(bsScore);

  const result = {
    ...parsed.data,
    bsScore,
    band: band.label,
    bandDescription: band.description,
    analyzedAt: new Date().toISOString(),
    pageTitle: extraction.title,
    pageUrl: extraction.url,
    provider,
    model: model || 'default'
  };

  onStateChange(UI_STATES.COMPLETE);

  return { success: true, result };
}
