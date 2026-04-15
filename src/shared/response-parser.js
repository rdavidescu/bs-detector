/**
 * BS Detector — Response Parser
 *
 * Parses AI response JSON into a canonical AnalysisResult.
 * Handles valid JSON, partial JSON, markdown-wrapped JSON,
 * and malformed responses gracefully.
 */

const COMPONENT_KEYS = [
  'evidence_weakness',
  'context_loss',
  'certainty_inflation',
  'emotional_pressure',
  'source_transparency'
];

const HAZARD_LABELS = ['none', 'low', 'moderate', 'high'];
const HAZARD_CATEGORIES = [
  'disputed_facts', 'conspiracy_adjacent', 'unverifiable',
  'polarizing_framing', 'speculative', 'routine'
];

/**
 * Clamp a number to a range.
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Try to extract JSON from a string that might be wrapped in markdown code blocks.
 */
function extractJSON(raw) {
  if (!raw || typeof raw !== 'string') return null;

  let cleaned = raw.trim();

  // Strip markdown code fences
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find JSON object in the string
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Normalize component scores — fill defaults, clamp values.
 */
function normalizeComponents(raw) {
  const components = {};
  for (const key of COMPONENT_KEYS) {
    const src = raw?.[key] || {};
    components[key] = {
      score: typeof src.score === 'number' ? clamp(src.score, 0, 10) : 0,
      reason: src.reason || ''
    };
  }
  return components;
}

/**
 * Parse an AI response string into a canonical AnalysisResult.
 *
 * @param {string} raw - Raw response content from the AI
 * @returns {{
 *   success: boolean,
 *   data?: {
 *     summary: string,
 *     bsScore: number,
 *     bsJustification: string,
 *     components: Record<string, { score: number, reason: string }>,
 *     claims: string[],
 *     redFlags: string[],
 *     confidence: string,
 *     suggestedAction: string
 *   },
 *   error?: string
 * }}
 */
export function parseResponse(raw) {
  if (!raw || (typeof raw === 'string' && raw.trim() === '')) {
    return { success: false, error: 'Response is empty' };
  }

  const parsed = extractJSON(raw);

  if (!parsed) {
    return { success: false, error: 'Could not parse JSON from response' };
  }

  // Extract and normalize all fields
  const bsScoreRaw = parsed.bs_score?.score ?? parsed.bsScore ?? 0;
  const bsScore = clamp(Math.round(Number(bsScoreRaw)), 0, 100);

  // --- Claim Hazard (dual-axis, independent of BS score) ---
  const hazardRaw = parsed.claim_hazard || {};
  const hazardLevel = clamp(Math.round(Number(hazardRaw.level ?? 0)), 0, 3);
  const hazardCategory = HAZARD_CATEGORIES.includes(hazardRaw.category)
    ? hazardRaw.category
    : 'routine';

  const data = {
    summary: parsed.summary || '',
    bsScore,
    bsJustification: parsed.bs_score?.justification || '',
    components: normalizeComponents(parsed.components),
    claims: Array.isArray(parsed.claims) ? parsed.claims : [],
    redFlags: Array.isArray(parsed.red_flags) ? parsed.red_flags : [],
    claimHazard: {
      level: hazardLevel,
      label: HAZARD_LABELS[hazardLevel] || 'none',
      category: hazardCategory,
      reason: hazardRaw.reason || ''
    },
    confidence: parsed.confidence || 'low',
    suggestedAction: parsed.suggested_action || ''
  };

  return { success: true, data };
}
