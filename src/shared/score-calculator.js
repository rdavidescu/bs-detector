/**
 * BS Detector — Score Calculator
 *
 * Computes the weighted BS Score from 5 component dimensions
 * and classifies into score bands.
 *
 * Weights: Evidence 30%, Context 20%, Certainty 20%, Emotion 15%, Source 15%
 */
import { SCORING } from './constants.js';

const DIMENSION_KEYS = Object.values(SCORING.DIMENSIONS);

/**
 * Calculate the weighted BS Score (0-100) from component scores.
 *
 * @param {Record<string, { score: number }>} components
 * @returns {number} Weighted score 0-100, rounded to nearest integer
 */
export function calculateBSScore(components) {
  if (!components || typeof components !== 'object') return 0;

  let weightedSum = 0;

  for (const dim of DIMENSION_KEYS) {
    const component = components[dim.key];
    const score = component?.score ?? 0;
    // Clamp to 0-10
    const clamped = Math.max(0, Math.min(SCORING.SCALE_MAX, score));
    weightedSum += clamped * dim.weight;
  }

  // Convert from 0-10 weighted scale to 0-100
  const bsScore = weightedSum * (100 / SCORING.SCALE_MAX);

  return Math.round(bsScore);
}

/**
 * Get the score band for a given BS Score.
 *
 * @param {number} score - BS Score 0-100
 * @returns {{ label: string, description: string }}
 */
export function getScoreBand(score) {
  for (const band of SCORING.BANDS) {
    if (score <= band.max) {
      return { label: band.label, description: band.description };
    }
  }
  // Fallback for scores > 100
  const last = SCORING.BANDS[SCORING.BANDS.length - 1];
  return { label: last.label, description: last.description };
}
