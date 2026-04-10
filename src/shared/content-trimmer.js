/**
 * BS Detector — Content Trimmer
 *
 * Enforces token budget limits on extracted content.
 * Budget: 3K tokens x 4 chars/token = 12,000 chars max.
 *
 * Trims at word boundaries to avoid sending partial words to the AI.
 */
import { CONTENT_LIMITS } from './constants.js';

/**
 * Trim content to fit within the token budget.
 *
 * @param {string} text - Raw extracted text
 * @returns {{ content: string, wasTrimmed: boolean, originalLength: number }}
 */
export function trimContent(text) {
  if (!text) {
    return { content: '', wasTrimmed: false, originalLength: 0 };
  }

  const originalLength = text.length;

  if (originalLength <= CONTENT_LIMITS.MAX_CHARS) {
    return { content: text, wasTrimmed: false, originalLength };
  }

  // Find a word boundary before the budget limit
  const markerLength = CONTENT_LIMITS.TRUNCATION_MARKER.length;
  const budget = CONTENT_LIMITS.MAX_CHARS - markerLength - 1; // -1 for the space before marker

  // Walk back from budget to find a space (word boundary)
  let cutPoint = budget;
  while (cutPoint > 0 && text[cutPoint] !== ' ') {
    cutPoint--;
  }

  // If no space found in a reasonable range, just cut at budget
  if (cutPoint < budget * 0.8) {
    cutPoint = budget;
  }

  const trimmed = text.slice(0, cutPoint) + ' ' + CONTENT_LIMITS.TRUNCATION_MARKER;

  return {
    content: trimmed,
    wasTrimmed: true,
    originalLength
  };
}
