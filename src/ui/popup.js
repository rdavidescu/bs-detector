/**
 * BS Detector — Popup Script
 *
 * Handles UI interactions: triggers analysis, displays results.
 */
import { MESSAGE_TYPES, UI_STATES } from '../shared/constants.js';

// DOM elements
const statusEl = document.getElementById('status');
const analyzeBtn = document.getElementById('analyze-btn');
const errorBox = document.getElementById('error-box');
const resultsEl = document.getElementById('results');
const scoreNumber = document.getElementById('score-number');
const scoreBand = document.getElementById('score-band');
const scoreJustification = document.getElementById('score-justification');
const summaryText = document.getElementById('summary-text');
const componentsList = document.getElementById('components-list');
const claimsList = document.getElementById('claims-list');
const flagsList = document.getElementById('flags-list');
const confidenceBadge = document.getElementById('confidence-badge');
const suggestedAction = document.getElementById('suggested-action');

const COMPONENT_LABELS = {
  evidence_weakness: 'Evidence Weakness',
  context_loss: 'Context Loss',
  certainty_inflation: 'Certainty Inflation',
  emotional_pressure: 'Emotional Pressure',
  source_transparency: 'Source Transparency'
};

function setStatus(state) {
  statusEl.textContent = state;
  statusEl.className = 'status ' + state;
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.style.display = 'block';
  resultsEl.style.display = 'none';
  setStatus(UI_STATES.ERROR);
  analyzeBtn.disabled = false;
}

function getScoreColor(score) {
  if (score <= 20) return '#16a34a';
  if (score <= 40) return '#84cc16';
  if (score <= 60) return '#d97706';
  if (score <= 80) return '#ea580c';
  return '#dc2626';
}

function getBandClass(band) {
  return 'band-' + (band || 'mixed');
}

function renderResults(data) {
  errorBox.style.display = 'none';
  resultsEl.style.display = 'block';

  // Score
  scoreNumber.textContent = data.bsScore;
  scoreNumber.style.color = getScoreColor(data.bsScore);
  scoreBand.textContent = (data.bandDescription || data.band || '').replace(/_/g, ' ');
  scoreBand.className = 'score-band ' + getBandClass(data.band);
  scoreJustification.textContent = data.bsJustification || '';

  // Summary
  summaryText.textContent = data.summary || '';

  // Components
  componentsList.innerHTML = '';
  for (const [key, label] of Object.entries(COMPONENT_LABELS)) {
    const comp = data.components?.[key] || { score: 0, reason: '' };
    const pct = (comp.score / 10) * 100;
    const color = getScoreColor(comp.score * 10);

    const row = document.createElement('div');
    row.className = 'component-row';
    row.title = comp.reason || '';
    row.innerHTML = `
      <span class="component-name">${label}</span>
      <span class="component-score" style="color:${color}">${comp.score}/10</span>
      <div class="component-bar">
        <div class="component-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
    `;
    componentsList.appendChild(row);
  }

  // Claims
  claimsList.innerHTML = '';
  for (const claim of (data.claims || [])) {
    const li = document.createElement('li');
    li.textContent = claim;
    claimsList.appendChild(li);
  }

  // Red flags
  flagsList.innerHTML = '';
  for (const flag of (data.redFlags || [])) {
    const li = document.createElement('li');
    li.textContent = flag;
    flagsList.appendChild(li);
  }

  // Meta
  confidenceBadge.textContent = 'Confidence: ' + (data.confidence || 'unknown');
  suggestedAction.textContent = data.suggestedAction || '';

  setStatus(UI_STATES.COMPLETE);
  analyzeBtn.disabled = false;
}

// Analyze button click
analyzeBtn.addEventListener('click', () => {
  analyzeBtn.disabled = true;
  errorBox.style.display = 'none';
  resultsEl.style.display = 'none';
  setStatus(UI_STATES.EXTRACTING);

  chrome.runtime.sendMessage(
    { type: MESSAGE_TYPES.TRIGGER_ANALYSIS },
    (_response) => {
      if (chrome.runtime.lastError) {
        showError('Could not reach background service. Try reloading the extension.');
        return;
      }
      // Response handled via onMessage listener below
    }
  );
});

// Listen for state updates and results from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MESSAGE_TYPES.ANALYSIS_STATE) {
    setStatus(message.state);
  }

  if (message.type === MESSAGE_TYPES.ANALYSIS_RESULT) {
    if (message.result?.success && message.result?.result) {
      renderResults(message.result.result);
    } else if (message.result?.error) {
      showError(message.result.error);
    } else {
      showError('Unexpected response format');
    }
  }
});
