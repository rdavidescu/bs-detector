/**
 * BS Detector — Background Service Worker
 *
 * Entry point for the extension's background process (MV3).
 * Listens for messages from popup, orchestrates analysis via pipeline.
 */
import { MESSAGE_TYPES } from '../shared/constants.js';
import { runAnalysis } from './analysis-pipeline.js';

/**
 * Seed API key from config.js into chrome.storage.local on install/startup.
 * config.js is gitignored and user-created from config.example.js.
 */
async function seedApiKeyFromConfig() {
  try {
    const { CONFIG } = await import('../config.js');
    if (CONFIG?.OPENROUTER_API_KEY &&
        CONFIG.OPENROUTER_API_KEY !== 'sk-or-v1-YOUR-KEY-HERE') {
      // Only seed if storage doesn't already have a key
      const stored = await chrome.storage.local.get(['apiKey']);
      if (!stored.apiKey) {
        await chrome.storage.local.set({ apiKey: CONFIG.OPENROUTER_API_KEY });
      }
    }
  } catch {
    // config.js doesn't exist yet — that's fine, user can set key via storage
  }
}

// Seed on install
chrome.runtime.onInstalled.addListener(() => {
  seedApiKeyFromConfig();
});

// Also seed on startup (in case key was added after install)
seedApiKeyFromConfig();

/**
 * Get API key from chrome.storage.local.
 */
async function getApiKey() {
  const result = await chrome.storage.local.get(['apiKey']);
  return result.apiKey || null;
}

/**
 * Send a state update to the popup.
 */
function notifyPopup(type, data) {
  chrome.runtime.sendMessage({ type, ...data }).catch(() => {
    // Popup might be closed — that's fine
  });
}

// Keep-alive: maintain connection to prevent SW from going idle during analysis
chrome.runtime.onConnect.addListener((port) => {
  port.onDisconnect.addListener(() => {
    // Clean up if needed
  });
});

// Message router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MESSAGE_TYPES.TRIGGER_ANALYSIS) {

    // Run async pipeline
    (async () => {
      try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
          const err = { success: false, error: 'No active tab found' };
          notifyPopup(MESSAGE_TYPES.ANALYSIS_RESULT, { result: err });
          sendResponse(err);
          return;
        }

        // Get API key
        const apiKey = await getApiKey();
        if (!apiKey) {
          const err = {
            success: false,
            error: 'API key not configured. Open DevTools console and run: chrome.storage.local.set({apiKey: "your-openrouter-key-here"})'
          };
          notifyPopup(MESSAGE_TYPES.ANALYSIS_RESULT, { result: err });
          sendResponse(err);
          return;
        }

        // Run the full pipeline
        const result = await runAnalysis({
          tabId: tab.id,
          apiKey,
          onStateChange: (state) => {
            notifyPopup(MESSAGE_TYPES.ANALYSIS_STATE, { state });
          }
        });

        // Send result back to popup
        notifyPopup(MESSAGE_TYPES.ANALYSIS_RESULT, { result });
        sendResponse(result);

      } catch (err) {
        const errorResult = { success: false, error: err.message || 'Unknown error' };
        notifyPopup(MESSAGE_TYPES.ANALYSIS_RESULT, { result: errorResult });
        sendResponse(errorResult);
      }
    })();

    return true; // Keep message channel open for async response
  }
});
