/**
 * WS-06 — Score Calculator Unit Tests (RED phase)
 *
 * Tests the weighted BS Score calculation and band classification.
 */
import { calculateBSScore, getScoreBand, getReportingBadge } from '../../src/shared/score-calculator.js';

describe('Score Calculator', () => {

  describe('calculateBSScore()', () => {

    it('calculates correct weighted score from known inputs', () => {
      const components = {
        evidence_weakness: { score: 2 },
        context_loss: { score: 3 },
        certainty_inflation: { score: 2 },
        emotional_pressure: { score: 1 },
        source_transparency: { score: 3 }
      };
      // (2*0.30 + 3*0.20 + 2*0.20 + 1*0.15 + 3*0.15) * 10 = (0.6+0.6+0.4+0.15+0.45)*10 = 22
      const score = calculateBSScore(components);
      expect(score).toBe(22);
    });

    it('returns 0 when all dimensions are 0', () => {
      const components = {
        evidence_weakness: { score: 0 },
        context_loss: { score: 0 },
        certainty_inflation: { score: 0 },
        emotional_pressure: { score: 0 },
        source_transparency: { score: 0 }
      };
      expect(calculateBSScore(components)).toBe(0);
    });

    it('returns 100 when all dimensions are 10', () => {
      const components = {
        evidence_weakness: { score: 10 },
        context_loss: { score: 10 },
        certainty_inflation: { score: 10 },
        emotional_pressure: { score: 10 },
        source_transparency: { score: 10 }
      };
      expect(calculateBSScore(components)).toBe(100);
    });

    it('rounds fractional results to nearest integer', () => {
      const components = {
        evidence_weakness: { score: 3 },
        context_loss: { score: 4 },
        certainty_inflation: { score: 3 },
        emotional_pressure: { score: 2 },
        source_transparency: { score: 4 }
      };
      const score = calculateBSScore(components);
      expect(Number.isInteger(score)).toBe(true);
    });

    it('handles missing dimensions by defaulting to 0', () => {
      const partial = {
        evidence_weakness: { score: 5 },
        context_loss: { score: 5 }
      };
      const score = calculateBSScore(partial);
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('handles empty components object', () => {
      const score = calculateBSScore({});
      expect(score).toBe(0);
    });
  });

  describe('getScoreBand()', () => {

    it('classifies 0-20 as low', () => {
      expect(getScoreBand(0).label).toBe('low');
      expect(getScoreBand(15).label).toBe('low');
      expect(getScoreBand(20).label).toBe('low');
    });

    it('classifies 21-40 as mild', () => {
      expect(getScoreBand(21).label).toBe('mild');
      expect(getScoreBand(35).label).toBe('mild');
      expect(getScoreBand(40).label).toBe('mild');
    });

    it('classifies 41-60 as mixed', () => {
      expect(getScoreBand(41).label).toBe('mixed');
      expect(getScoreBand(55).label).toBe('mixed');
    });

    it('classifies 61-80 as high', () => {
      expect(getScoreBand(70).label).toBe('high');
    });

    it('classifies 81-100 as very_high', () => {
      expect(getScoreBand(85).label).toBe('very_high');
      expect(getScoreBand(100).label).toBe('very_high');
    });

    it('returns description with each band', () => {
      const band = getScoreBand(50);
      expect(band.description).toBeDefined();
      expect(typeof band.description).toBe('string');
    });
  });

  describe('getReportingBadge()', () => {

    it('returns careful for 0-20', () => {
      expect(getReportingBadge(0)).toBe('careful');
      expect(getReportingBadge(15)).toBe('careful');
      expect(getReportingBadge(20)).toBe('careful');
    });

    it('returns decent for 21-40', () => {
      expect(getReportingBadge(21)).toBe('decent');
      expect(getReportingBadge(40)).toBe('decent');
    });

    it('returns mixed for 41-60', () => {
      expect(getReportingBadge(41)).toBe('mixed');
      expect(getReportingBadge(60)).toBe('mixed');
    });

    it('returns sloppy for 61-80', () => {
      expect(getReportingBadge(61)).toBe('sloppy');
      expect(getReportingBadge(80)).toBe('sloppy');
    });

    it('returns unreliable for 81-100', () => {
      expect(getReportingBadge(81)).toBe('unreliable');
      expect(getReportingBadge(100)).toBe('unreliable');
    });

    it('returns unreliable for scores above 100', () => {
      expect(getReportingBadge(150)).toBe('unreliable');
    });
  });
});
