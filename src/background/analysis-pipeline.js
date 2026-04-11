/**
 * BS Detector — Analysis Pipeline
 *
 * Orchestrates the full analysis chain:
 * content extraction -> prompt building -> API call -> response parsing -> scoring
 *
 * Called by the service worker when TRIGGER_ANALYSIS is received.
 */
import { buildPrompt } from '../prompts/prompt-engine.js';
import { callOpenRouter } from '../providers/adapters/openrouter.js';
import { parseResponse } from '../shared/response-parser.js';
import { calculateBSScore, getScoreBand } from '../shared/score-calculator.js';
import { ANALYSIS_MODES, UI_STATES, MESSAGE_TYPES } from '../shared/constants.js';

/**
 * Run the full analysis pipeline.
 *
 * @param {{
 *   tabId: number,
 *   apiKey: string,
 *   onStateChange: (state: string) => void
 * }} params
 * @returns {Promise<{ success: boolean, result?: object, error?: string }>}
 */
export async function runAnalysis({ tabId, apiKey, onStateChange }) {

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

  // Step 3: Call OpenRouter
  const apiResult = await callOpenRouter({
    messages: prompt.messages,
    apiKey
  });

  if (!apiResult.success) {
    const errorMessages = {
      invalid_key: 'Invalid API key. Check your OpenRouter key in settings.',
      rate_limited: 'Rate limited. Free tier allows ~50 requests/day. Try again later.',
      timeout: 'Request timed out. The AI model may be busy.',
      network_error: 'Network error. Check your internet connection.',
      provider_error: 'OpenRouter server error. Try again in a moment.'
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
    pageUrl: extraction.url
  };

  onStateChange(UI_STATES.COMPLETE);

  return { success: true, result };
}
