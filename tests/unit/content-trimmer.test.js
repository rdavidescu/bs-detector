/**
 * WS-02 — Content Trimmer Unit Tests (RED phase — written before implementation)
 *
 * Tests the content trimming logic that enforces token budget limits.
 * Budget: 3K tokens × 4 chars/token = 12,000 chars max.
 */
import { trimContent } from '../../src/shared/content-trimmer.js';
import { CONTENT_LIMITS } from '../../src/shared/constants.js';

describe('Content Trimmer', () => {

  describe('trimContent()', () => {

    it('returns short content unchanged', () => {
      const input = 'This is a short article about testing.';
      const result = trimContent(input);
      expect(result.content).toBe(input);
      expect(result.wasTrimmed).toBe(false);
    });

    it('trims content exceeding MAX_CHARS budget', () => {
      const input = 'a'.repeat(15_000);
      const result = trimContent(input);
      expect(result.content.length).toBeLessThanOrEqual(CONTENT_LIMITS.MAX_CHARS);
      expect(result.wasTrimmed).toBe(true);
    });

    it('appends truncation marker when content is trimmed', () => {
      const input = 'word '.repeat(5_000); // 25,000 chars
      const result = trimContent(input);
      expect(result.content).toContain(CONTENT_LIMITS.TRUNCATION_MARKER);
    });

    it('does not append marker when content is under budget', () => {
      const input = 'Short content here.';
      const result = trimContent(input);
      expect(result.content).not.toContain(CONTENT_LIMITS.TRUNCATION_MARKER);
    });

    it('preserves word boundaries when trimming', () => {
      // Build content where cutting at exactly MAX_CHARS would land mid-word
      const words = 'longerword ';
      const input = words.repeat(2000); // ~22,000 chars
      const result = trimContent(input);
      // Content before the marker should end with a complete word, not a fragment
      const contentBeforeMarker = result.content.replace(CONTENT_LIMITS.TRUNCATION_MARKER, '').trim();
      // Every word in the trimmed content should be the full word 'longerword'
      const remainingWords = contentBeforeMarker.split(/\s+/).filter(Boolean);
      for (const word of remainingWords) {
        expect(word).toBe('longerword');
      }
    });

    it('handles empty string input', () => {
      const result = trimContent('');
      expect(result.content).toBe('');
      expect(result.wasTrimmed).toBe(false);
    });

    it('handles content exactly at the limit', () => {
      const input = 'a'.repeat(CONTENT_LIMITS.MAX_CHARS);
      const result = trimContent(input);
      expect(result.wasTrimmed).toBe(false);
      expect(result.content).toBe(input);
    });

    it('returns original char count in metadata', () => {
      const input = 'x'.repeat(15_000);
      const result = trimContent(input);
      expect(result.originalLength).toBe(15_000);
    });
  });
});
