/**
 * WS-06 — Response Parser Unit Tests (RED phase)
 *
 * Tests parsing of AI response JSON and extraction of scoring data.
 */
import { parseResponse } from '../../src/shared/response-parser.js';

describe('Response Parser', () => {

  const validResponse = JSON.stringify({
    summary: 'Well-sourced article with clear citations.',
    bs_score: { score: 22, justification: 'Mostly solid sourcing', note: 'Fast estimate' },
    components: {
      evidence_weakness: { score: 2, reason: 'Clear citations throughout' },
      context_loss: { score: 3, reason: 'Some context missing' },
      certainty_inflation: { score: 2, reason: 'Cautious language used' },
      emotional_pressure: { score: 1, reason: 'Neutral tone' },
      source_transparency: { score: 3, reason: 'Most sources named' }
    },
    claims: ['Global temps rose 1.2C', 'Based on 3000 stations', 'Consistent with IPCC'],
    red_flags: ['Limited time period discussed'],
    claim_hazard: {
      level: 1,
      label: 'low',
      category: 'disputed_facts',
      reason: 'Some claims about temperature records are debated in fringe circles'
    },
    confidence: 'medium',
    suggested_action: 'Read with normal caution'
  });

  it('parses valid JSON into AnalysisResult with all fields', () => {
    const result = parseResponse(validResponse);
    expect(result.success).toBe(true);
    expect(result.data.summary).toContain('Well-sourced');
    expect(result.data.bsScore).toBeDefined();
    expect(result.data.components).toBeDefined();
    expect(result.data.claims).toHaveLength(3);
    expect(result.data.redFlags).toHaveLength(1);
    expect(result.data.confidence).toBe('medium');
    expect(result.data.suggestedAction).toContain('caution');
  });

  it('extracts bs_score as a number', () => {
    const result = parseResponse(validResponse);
    expect(typeof result.data.bsScore).toBe('number');
    expect(result.data.bsScore).toBe(22);
  });

  it('extracts all 5 component scores', () => {
    const result = parseResponse(validResponse);
    const c = result.data.components;
    expect(c.evidence_weakness.score).toBe(2);
    expect(c.context_loss.score).toBe(3);
    expect(c.certainty_inflation.score).toBe(2);
    expect(c.emotional_pressure.score).toBe(1);
    expect(c.source_transparency.score).toBe(3);
  });

  it('handles missing optional fields with defaults', () => {
    const partial = JSON.stringify({
      summary: 'Short summary.',
      bs_score: { score: 45 },
      components: {
        evidence_weakness: { score: 5 }
      }
    });
    const result = parseResponse(partial);
    expect(result.success).toBe(true);
    expect(result.data.claims).toEqual([]);
    expect(result.data.redFlags).toEqual([]);
    expect(result.data.confidence).toBe('low');
    expect(result.data.components.context_loss.score).toBe(0);
  });

  it('clamps component scores to 0-10 range', () => {
    const outOfRange = JSON.stringify({
      summary: 'Test',
      bs_score: { score: 50 },
      components: {
        evidence_weakness: { score: 15, reason: 'Way too high' },
        context_loss: { score: -3, reason: 'Negative' },
        certainty_inflation: { score: 5 },
        emotional_pressure: { score: 5 },
        source_transparency: { score: 5 }
      }
    });
    const result = parseResponse(outOfRange);
    expect(result.data.components.evidence_weakness.score).toBe(10);
    expect(result.data.components.context_loss.score).toBe(0);
  });

  it('clamps bs_score to 0-100 range', () => {
    const high = JSON.stringify({
      summary: 'Test',
      bs_score: { score: 150 },
      components: {}
    });
    const result = parseResponse(high);
    expect(result.data.bsScore).toBe(100);
  });

  it('returns error result for empty string', () => {
    const result = parseResponse('');
    expect(result.success).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('returns error result for null input', () => {
    const result = parseResponse(null);
    expect(result.success).toBe(false);
  });

  it('attempts to parse malformed JSON gracefully', () => {
    const broken = '{"summary": "test", "bs_score": {"score": 42}, broken json here';
    const result = parseResponse(broken);
    // Should either extract what it can or return an error — not crash
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });

  it('handles JSON wrapped in markdown code blocks', () => {
    const wrapped = '```json\n' + validResponse + '\n```';
    const result = parseResponse(wrapped);
    expect(result.success).toBe(true);
    expect(result.data.bsScore).toBe(22);
  });

  // --- Claim Hazard (dual-axis) ---

  it('parses claim_hazard with all fields', () => {
    const result = parseResponse(validResponse);
    expect(result.data.claimHazard).toBeDefined();
    expect(result.data.claimHazard.level).toBe(1);
    expect(result.data.claimHazard.label).toBe('low');
    expect(result.data.claimHazard.category).toBe('disputed_facts');
    expect(result.data.claimHazard.reason).toContain('temperature');
  });

  it('defaults claim_hazard to none when missing from response', () => {
    const noHazard = JSON.stringify({
      summary: 'Test',
      bs_score: { score: 30 },
      components: {}
    });
    const result = parseResponse(noHazard);
    expect(result.data.claimHazard.level).toBe(0);
    expect(result.data.claimHazard.label).toBe('none');
    expect(result.data.claimHazard.category).toBe('routine');
    expect(result.data.claimHazard.reason).toBe('');
  });

  it('clamps claim_hazard level to 0-3 range', () => {
    const highLevel = JSON.stringify({
      summary: 'Test',
      bs_score: { score: 50 },
      components: {},
      claim_hazard: { level: 7, label: 'high', category: 'conspiracy_adjacent', reason: 'Off the charts' }
    });
    const result = parseResponse(highLevel);
    expect(result.data.claimHazard.level).toBe(3);

    const negLevel = JSON.stringify({
      summary: 'Test',
      bs_score: { score: 50 },
      components: {},
      claim_hazard: { level: -2, label: 'none', category: 'routine', reason: '' }
    });
    const resultNeg = parseResponse(negLevel);
    expect(resultNeg.data.claimHazard.level).toBe(0);
  });

  it('rejects unknown claim_hazard categories and defaults to routine', () => {
    const unknownCat = JSON.stringify({
      summary: 'Test',
      bs_score: { score: 50 },
      components: {},
      claim_hazard: { level: 2, label: 'moderate', category: 'alien_invasion', reason: 'Not real' }
    });
    const result = parseResponse(unknownCat);
    expect(result.data.claimHazard.category).toBe('routine');
  });

  it('claim_hazard is independent of bs_score', () => {
    const lowBsHighHazard = JSON.stringify({
      summary: 'Well-written conspiracy article',
      bs_score: { score: 12 },
      components: { evidence_weakness: { score: 1 } },
      claim_hazard: { level: 3, label: 'high', category: 'conspiracy_adjacent', reason: 'Hidden actors invoked' }
    });
    const result = parseResponse(lowBsHighHazard);
    expect(result.data.bsScore).toBe(12);
    expect(result.data.claimHazard.level).toBe(3);
    expect(result.data.claimHazard.label).toBe('high');
  });
});
