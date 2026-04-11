/**
 * BS Detector — Shared Constants
 *
 * Single source of truth for enums, limits, and config defaults.
 */

// --- Analysis Modes ---
export const ANALYSIS_MODES = {
  QUICK: 'quick',
  STANDARD: 'standard'
};

// --- Content Types ---
export const CONTENT_TYPES = {
  ARTICLE: 'article',
  SOCIAL_POST: 'social_post',
  VIDEO_PAGE: 'video_page',
  FORUM: 'forum',
  PRODUCT_PAGE: 'product_page',
  UNKNOWN: 'unknown'
};

// --- Content Limits ---
export const CONTENT_LIMITS = {
  MAX_CHARS: 12000,
  MIN_CHARS: 100,
  TRUNCATION_MARKER: '[content truncated...]'
};

// --- Scoring ---
export const SCORING = {
  DIMENSIONS: {
    EVIDENCE_WEAKNESS:    { key: 'evidence_weakness',    weight: 0.30 },
    CONTEXT_LOSS:         { key: 'context_loss',         weight: 0.20 },
    CERTAINTY_INFLATION:  { key: 'certainty_inflation',  weight: 0.20 },
    EMOTIONAL_PRESSURE:   { key: 'emotional_pressure',   weight: 0.15 },
    SOURCE_TRANSPARENCY:  { key: 'source_transparency',  weight: 0.15 }
  },
  BANDS: [
    { max: 20,  label: 'low',       description: 'Minimal BS detected' },
    { max: 40,  label: 'mild',      description: 'Some patterns worth noting' },
    { max: 60,  label: 'mixed',     description: 'Notable credibility concerns' },
    { max: 80,  label: 'high',      description: 'Significant BS patterns' },
    { max: 100, label: 'very_high', description: 'Heavy BS throughout' }
  ],
  SCALE_MAX: 10
};

// --- UI States ---
export const UI_STATES = {
  IDLE: 'idle',
  EXTRACTING: 'extracting',
  ANALYZING: 'analyzing',
  COMPLETE: 'complete',
  ERROR: 'error',
  PARTIAL: 'partial'
};

// --- Message Types ---
export const MESSAGE_TYPES = {
  TRIGGER_ANALYSIS: 'TRIGGER_ANALYSIS',
  EXTRACT_CONTENT: 'EXTRACT_CONTENT',
  ANALYZE_REQUEST: 'ANALYZE_REQUEST',
  ANALYSIS_STATE: 'ANALYSIS_STATE',
  ANALYSIS_RESULT: 'ANALYSIS_RESULT'
};

// --- Provider Defaults ---
export const PROVIDER_DEFAULTS = {
  PROVIDER: 'openrouter',
  MODE: ANALYSIS_MODES.QUICK,
  OPENROUTER_API_URL: 'https://openrouter.ai/api/v1/chat/completions',
  OPENROUTER_FREE_MODEL: 'meta-llama/llama-3.3-70b-instruct:free',
  REQUEST_TIMEOUT_MS: 30000,
  MAX_RETRIES: 1
};
