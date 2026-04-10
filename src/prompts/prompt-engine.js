/**
 * BS Detector — Prompt Engine
 *
 * Selects and assembles prompt templates based on analysis mode.
 * Injects page content, title, URL, and content type into placeholders.
 * Returns messages array ready for OpenRouter chat completions API.
 */
import { ANALYSIS_MODES } from '../shared/constants.js';
import { QUICK_SYSTEM_PROMPT, QUICK_USER_TEMPLATE } from './templates/quick.js';

/**
 * Template registry — maps mode to system prompt + user template.
 * Standard/Deep modes added post-MVP.
 */
const TEMPLATES = {
  [ANALYSIS_MODES.QUICK]: {
    system: QUICK_SYSTEM_PROMPT,
    user: QUICK_USER_TEMPLATE
  }
};

/**
 * Replace all {{placeholder}} tokens in a template string.
 *
 * @param {string} template - Template with {{key}} placeholders
 * @param {Record<string, string>} values - Key-value pairs to inject
 * @returns {string} Assembled string with placeholders replaced
 */
function injectValues(template, values) {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{{${key}}}`;
    result = result.replaceAll(placeholder, value || '(not provided)');
  }
  return result;
}

/**
 * Build a complete prompt from extracted content.
 *
 * @param {{
 *   mode: string,
 *   title: string,
 *   url: string,
 *   content: string,
 *   contentType: string
 * }} input - Extraction result + analysis mode
 * @returns {{
 *   system: string,
 *   user: string,
 *   messages: Array<{ role: string, content: string }>
 * }}
 * @throws {Error} If required fields are missing
 */
export function buildPrompt(input) {
  // Validate required fields
  if (!input || !input.mode) {
    throw new Error('Prompt engine: mode is required');
  }
  if (!input.content || input.content.trim() === '') {
    throw new Error('Prompt engine: content is required and cannot be empty');
  }

  const template = TEMPLATES[input.mode];
  if (!template) {
    throw new Error(`Prompt engine: unsupported mode "${input.mode}"`);
  }

  // Map input fields to template placeholder keys
  const values = {
    page_title: input.title || '',
    page_url: input.url || '',
    content_type: input.contentType || 'unknown',
    page_content: input.content
  };

  const system = template.system;
  const user = injectValues(template.user, values);

  return {
    system,
    user,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  };
}
