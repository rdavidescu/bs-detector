/**
 * BS Detector — Background Service Worker
 *
 * Entry point for the extension's background process (MV3).
 * Listens for messages from popup and content scripts,
 * orchestrates the analysis pipeline.
 *
 * WS-01: Empty shell — message routing added in WS-07.
 */

import { MESSAGE_TYPES } from '../shared/constants.js';

// Keep-alive: maintain connection to prevent SW from going idle during analysis
chrome.runtime.onConnect.addListener((port) => {
  port.onDisconnect.addListener(() => {
    // Clean up if needed
  });
});

// Message router — placeholder for WS-07 wiring
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === MESSAGE_TYPES.TRIGGER_ANALYSIS) {
    // TODO: WS-07 — wire analysis pipeline here
    sendResponse({ status: 'not_implemented' });
  }
  return true; // Keep message channel open for async response
});

// eslint-disable-next-line no-console
console.log('[BS Detector] Service worker registered');
