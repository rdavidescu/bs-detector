/**
 * BS Detector — Popup Script
 *
 * Handles UI interactions in the popup window.
 * Sends TRIGGER_ANALYSIS to background, displays results.
 *
 * WS-01: Minimal shell — full UI wiring in WS-08.
 */

import { MESSAGE_TYPES, UI_STATES } from '../shared/constants.js';

const statusEl = document.getElementById('status');
const analyzeBtn = document.getElementById('analyze-btn');
const resultsEl = document.getElementById('results');

function updateStatus(state) {
  statusEl.textContent = state;
}

analyzeBtn.addEventListener('click', () => {
  updateStatus(UI_STATES.EXTRACTING);
  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.TRIGGER_ANALYSIS });
});

// Listen for results from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MESSAGE_TYPES.ANALYSIS_STATE) {
    updateStatus(message.state);
  }
  if (message.type === MESSAGE_TYPES.ANALYSIS_RESULT) {
    updateStatus(UI_STATES.COMPLETE);
    resultsEl.textContent = JSON.stringify(message.result, null, 2);
  }
});
