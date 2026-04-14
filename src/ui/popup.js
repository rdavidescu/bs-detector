/**
 * BS Detector — Popup Script (UX-01 Redesign)
 *
 * Handles UI interactions: triggers analysis, displays results.
 * Features: SVG gauge, green-to-brown palette, funny loading text,
 * provider+model inline dropdown.
 */
import { MESSAGE_TYPES, UI_STATES } from '../shared/constants.js';
import { buildProviderSelector } from './popup-provider-selector.js';

// ── DOM elements ──────────────────────────────────────────────────────────────

const statusEl = document.getElementById('status');
const analyzeBtn = document.getElementById('analyze-btn');
const errorBox = document.getElementById('error-box');
const resultsEl = document.getElementById('results');
const gaugeSvg = document.getElementById('gauge-svg');
const scoreNumber = document.getElementById('score-number');
const scoreBand = document.getElementById('score-band');
const scoreJustification = document.getElementById('score-justification');
const confidenceValue = document.getElementById('confidence-value');
const componentsList = document.getElementById('components-list');
const flagsList = document.getElementById('flags-list');
const summaryText = document.getElementById('summary-text');
const claimsList = document.getElementById('claims-list');
const suggestedAction = document.getElementById('suggested-action');
const modelInfo = document.getElementById('model-info');

const COMPONENT_LABELS = {
  evidence_weakness: 'Evidence Weakness',
  context_loss: 'Context Loss',
  certainty_inflation: 'Certainty Inflation',
  emotional_pressure: 'Emotional Pressure',
  source_transparency: 'Source Transparency'
};

// ── Color palette (green → orange → brown) ────────────────────────────────────

/**
 * Returns a color from the green-to-brown palette based on score (0–100).
 * No yellow, no red — stays on brand.
 */
function getScoreColor(score) {
  if (score <= 20) return '#15803d';   // dark green — solid
  if (score <= 40) return '#65a30d';   // olive green — mild
  if (score <= 60) return '#b45309';   // warm orange — mixed
  if (score <= 80) return '#92400e';   // deep brown-orange — high
  return '#78350f';                     // dark brown (hankey) — very high
}

// ── SVG Gauge ─────────────────────────────────────────────────────────────────

/**
 * Builds an SVG semicircle gauge with a gradient from green to brown.
 *
 * Uses stroke-dasharray trick: the fill path is the EXACT same semicircle
 * as the background, just clipped via dash offset. This guarantees both
 * arcs are perfectly aligned — zero arc math mismatch possible.
 *
 * @param {number} score — 0 to 100
 */
function renderGauge(score) {
  const r = 80;
  const strokeWidth = 14;
  const cx = 100;
  const cy = 100;

  // One single semicircle path (left → over the top → right)
  // M 20,100 A 80,80 0 0,1 180,100
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  // Total length of a semicircle = π × r
  const totalLen = Math.PI * r; // ≈ 251.33

  // Fill length proportional to score
  const clamped = Math.max(0, Math.min(score, 100));
  const fillLen = (clamped / 100) * totalLen;

  const gradientId = 'gaugeGrad';

  gaugeSvg.innerHTML = `
    <defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#15803d"/>
        <stop offset="30%" stop-color="#65a30d"/>
        <stop offset="55%" stop-color="#b45309"/>
        <stop offset="80%" stop-color="#92400e"/>
        <stop offset="100%" stop-color="#78350f"/>
      </linearGradient>
    </defs>
    <path d="${arcPath}" fill="none" stroke="#e5e2de" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    <path d="${arcPath}" fill="none" stroke="url(#${gradientId})" stroke-width="${strokeWidth}" stroke-linecap="round"
          stroke-dasharray="${totalLen}" stroke-dashoffset="${totalLen - fillLen}"/>
  `;
}

// ── Funny loading messages ────────────────────────────────────────────────────

const FUNNY_MESSAGES = [
  'Sniffing for BS...',
  'Consulting the smell-o-meter...',
  'Checking the manure levels...',
  'Deploying truth goggles...',
  'Calibrating the poop radar...',
  'Separating fact from fertilizer...',
  'Asking the hard questions...',
  'Scanning for bovine excrement...',
  'Running the stink analysis...',
  'Measuring the hot air index...',
  'Poking holes in the narrative...',
  'Interrogating the paragraphs...',
  'Shaking the evidence tree...',
  'Cross-examining the claims...',
  'Rating the spin cycle...',
  'Detecting suspicious odors...',
  'Engaging BS shields...',
  'Warming up the skepticism engine...',
  'Fact-checking with extreme prejudice...',
  'Applying industrial-grade doubt...',
];

let funnyInterval = null;
let analysisFinished = false;

function startFunnyText() {
  // Don't restart funny text if analysis already finished (error or result)
  if (analysisFinished) return;

  stopFunnyText();
  let idx = Math.floor(Math.random() * FUNNY_MESSAGES.length);
  statusEl.textContent = FUNNY_MESSAGES[idx];

  funnyInterval = setInterval(() => {
    idx = (idx + 1) % FUNNY_MESSAGES.length;
    statusEl.textContent = FUNNY_MESSAGES[idx];
  }, 3500);
}

function stopFunnyText() {
  if (funnyInterval) {
    clearInterval(funnyInterval);
    funnyInterval = null;
  }
}

// ── Status ────────────────────────────────────────────────────────────────────

function setStatus(state) {
  if (state === UI_STATES.EXTRACTING || state === UI_STATES.ANALYZING) {
    startFunnyText();
  } else {
    stopFunnyText();
    statusEl.textContent = state;
  }
  statusEl.className = 'status ' + state;
}

function showError(message) {
  analysisFinished = true;
  stopFunnyText();
  errorBox.textContent = message;
  errorBox.style.display = 'block';
  resultsEl.style.display = 'none';
  statusEl.textContent = 'Error';
  statusEl.className = 'status error';
  analyzeBtn.disabled = false;
}

// ── Render results ────────────────────────────────────────────────────────────

function renderResults(data) {
  analysisFinished = true;
  stopFunnyText();
  errorBox.style.display = 'none';
  resultsEl.style.display = 'block';

  // Gauge + Score
  renderGauge(data.bsScore);
  scoreNumber.textContent = data.bsScore;
  scoreNumber.style.color = getScoreColor(data.bsScore);

  // Band title — black text, no color matching
  const bandText = (data.bandDescription || data.band || '').replace(/_/g, ' ');
  scoreBand.textContent = bandText;

  // Justification (not italic anymore — handled in CSS)
  scoreJustification.textContent = data.bsJustification || '';

  // Confidence — right below justification
  if (confidenceValue) {
    confidenceValue.textContent = data.confidence || 'unknown';
  }

  // Component Scores
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

  // Red Flags
  flagsList.innerHTML = '';
  for (const flag of (data.redFlags || [])) {
    const li = document.createElement('li');
    li.textContent = flag;
    flagsList.appendChild(li);
  }

  // Summary
  summaryText.textContent = data.summary || '';

  // Claims
  claimsList.innerHTML = '';
  for (const claim of (data.claims || [])) {
    const li = document.createElement('li');
    li.textContent = claim;
    claimsList.appendChild(li);
  }

  // Footer
  if (suggestedAction) {
    suggestedAction.textContent = data.suggestedAction || '';
  }

  // Model signature
  if (modelInfo && data.provider) {
    const providerLabel = data.provider.charAt(0).toUpperCase() + data.provider.slice(1);
    const modelId = data.model || 'default';
    const shortModel = modelId.includes('/') ? modelId.split('/').pop() : modelId;
    modelInfo.textContent = `${providerLabel} · ${shortModel}`;
  }

  setStatus(UI_STATES.COMPLETE);
  analyzeBtn.disabled = false;
}

// ── Settings button ───────────────────────────────────────────────────────────

const settingsBtn = document.getElementById('settings-btn');
if (settingsBtn) {
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

// ── Provider selector with model name inline ──────────────────────────────────

buildProviderSelector();

// ── Analyze button ────────────────────────────────────────────────────────────

analyzeBtn.addEventListener('click', () => {
  analysisFinished = false;
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

// ── Listen for state updates and results from background ──────────────────────

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
