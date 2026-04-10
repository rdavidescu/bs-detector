/**
 * BS Detector — Content Script
 *
 * Injected into web pages. Extracts visible text content
 * and sends it to the background service worker for analysis.
 *
 * WS-01: Empty shell — extraction logic added in WS-02.
 */

import { MESSAGE_TYPES } from '../shared/constants.js';

// Listen for extraction requests from background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === MESSAGE_TYPES.EXTRACT_CONTENT) {
    // TODO: WS-02 — implement extractContent() here
    sendResponse({ status: 'not_implemented' });
  }
  return true;
});
