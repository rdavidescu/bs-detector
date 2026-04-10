/**
 * TDD Anchor — WS-01 dummy test
 *
 * Verifies the shared constants module exists and exports expected shapes.
 * Written BEFORE implementation (per TDD: Red then Green then Refactor).
 */
import {
  ANALYSIS_MODES,
  CONTENT_TYPES,
  CONTENT_LIMITS,
  SCORING,
  UI_STATES,
  MESSAGE_TYPES,
  PROVIDER_DEFAULTS
} from '../../src/shared/constants.js';

describe('Shared Constants', () => {
  it('exports ANALYSIS_MODES with QUICK mode', () => {
    expect(ANALYSIS_MODES).toBeDefined();
    expect(ANALYSIS_MODES.QUICK).toBe('quick');
  });

  it('exports CONTENT_TYPES with required enum values', () => {
    expect(CONTENT_TYPES).toBeDefined();
    expect(CONTENT_TYPES.ARTICLE).toBe('article');
    expect(CONTENT_TYPES.UNKNOWN).toBe('unknown');
  });

  it('exports CONTENT_LIMITS with correct budget', () => {
    expect(CONTENT_LIMITS.MAX_CHARS).toBe(12000);
    expect(CONTENT_LIMITS.MIN_CHARS).toBe(100);
    expect(CONTENT_LIMITS.TRUNCATION_MARKER).toContain('truncated');
  });

  it('exports SCORING with 5 dimensions that sum to weight 1.0', () => {
    const dims = Object.values(SCORING.DIMENSIONS);
    expect(dims).toHaveLength(5);
    const totalWeight = dims.reduce((sum, d) => sum + d.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });

  it('exports SCORING bands covering 0 to 100 range', () => {
    expect(SCORING.BANDS[0].max).toBe(20);
    expect(SCORING.BANDS[SCORING.BANDS.length - 1].max).toBe(100);
  });

  it('exports UI_STATES with all required states', () => {
    const required = ['IDLE', 'EXTRACTING', 'ANALYZING', 'COMPLETE', 'ERROR', 'PARTIAL'];
    for (const state of required) {
      expect(UI_STATES[state]).toBeDefined();
    }
  });

  it('exports MESSAGE_TYPES with the full message protocol', () => {
    const required = [
      'TRIGGER_ANALYSIS',
      'EXTRACT_CONTENT',
      'ANALYZE_REQUEST',
      'ANALYSIS_STATE',
      'ANALYSIS_RESULT'
    ];
    for (const type of required) {
      expect(MESSAGE_TYPES[type]).toBe(type);
    }
  });

  it('exports PROVIDER_DEFAULTS targeting OpenRouter', () => {
    expect(PROVIDER_DEFAULTS.PROVIDER).toBe('openrouter');
    expect(PROVIDER_DEFAULTS.OPENROUTER_API_URL).toContain('openrouter.ai');
    expect(PROVIDER_DEFAULTS.MODE).toBe('quick');
  });
});
