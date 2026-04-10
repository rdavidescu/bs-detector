/**
 * WS-04 — Prompt Engine Unit Tests (RED phase — written before implementation)
 *
 * Tests the prompt assembly logic that builds structured prompts
 * from extracted content for the OpenRouter API call.
 */
import { buildPrompt } from '../../src/prompts/prompt-engine.js';
import { ANALYSIS_MODES, CONTENT_TYPES } from '../../src/shared/constants.js';

describe('Prompt Engine', () => {

  const validInput = {
    mode: ANALYSIS_MODES.QUICK,
    title: 'Climate Change Report Shows Rising Temperatures',
    url: 'https://example.com/article/climate',
    content: 'Scientists published findings today showing a consistent upward trend in global temperatures over the past decade. The report is based on data from over 3,000 monitoring stations worldwide.',
    contentType: CONTENT_TYPES.ARTICLE
  };

  describe('buildPrompt()', () => {

    it('returns object with system and user message strings', () => {
      const result = buildPrompt(validInput);
      expect(result).toHaveProperty('system');
      expect(result).toHaveProperty('user');
      expect(typeof result.system).toBe('string');
      expect(typeof result.user).toBe('string');
    });

    it('returns messages array formatted for OpenRouter chat completions', () => {
      const result = buildPrompt(validInput);
      expect(result).toHaveProperty('messages');
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.messages.length).toBeGreaterThanOrEqual(2);
      expect(result.messages[0].role).toBe('system');
      expect(result.messages[1].role).toBe('user');
    });

    it('injects page title into the prompt', () => {
      const result = buildPrompt(validInput);
      expect(result.user).toContain('Climate Change Report Shows Rising Temperatures');
    });

    it('injects page URL into the prompt', () => {
      const result = buildPrompt(validInput);
      expect(result.user).toContain('https://example.com/article/climate');
    });

    it('injects page content into the prompt', () => {
      const result = buildPrompt(validInput);
      expect(result.user).toContain('Scientists published findings today');
    });

    it('injects content type into the prompt', () => {
      const result = buildPrompt(validInput);
      expect(result.user).toContain('article');
    });

    it('has no unresolved {{placeholder}} patterns in output', () => {
      const result = buildPrompt(validInput);
      const placeholderRegex = /\{\{[^}]+\}\}/g;
      expect(result.system).not.toMatch(placeholderRegex);
      expect(result.user).not.toMatch(placeholderRegex);
    });

    it('includes JSON response format instruction in system prompt', () => {
      const result = buildPrompt(validInput);
      const fullText = result.system + result.user;
      expect(fullText).toMatch(/json/i);
    });

    it('includes the 5 scoring dimensions in the prompt', () => {
      const result = buildPrompt(validInput);
      const fullText = result.system + result.user;
      expect(fullText).toContain('Evidence Weakness');
      expect(fullText).toContain('Context Loss');
      expect(fullText).toContain('Certainty Inflation');
      expect(fullText).toContain('Emotional Pressure');
      expect(fullText).toContain('Source Transparency');
    });

    it('includes scoring weights in the prompt', () => {
      const result = buildPrompt(validInput);
      const fullText = result.system + result.user;
      expect(fullText).toContain('30%');
      expect(fullText).toContain('20%');
      expect(fullText).toContain('15%');
    });

    it('throws on empty content', () => {
      expect(() => buildPrompt({ ...validInput, content: '' })).toThrow();
    });

    it('throws on missing content', () => {
      expect(() => buildPrompt({
        mode: validInput.mode,
        title: validInput.title,
        url: validInput.url,
        contentType: validInput.contentType
      })).toThrow();
    });

    it('throws on missing mode', () => {
      expect(() => buildPrompt({
        title: validInput.title,
        url: validInput.url,
        content: validInput.content,
        contentType: validInput.contentType
      })).toThrow();
    });

    it('handles missing optional fields gracefully', () => {
      const minimal = {
        mode: ANALYSIS_MODES.QUICK,
        content: 'Enough content here to pass the minimum threshold for analysis in the BS Detector extension tool.',
        title: '',
        url: '',
        contentType: CONTENT_TYPES.UNKNOWN
      };
      const result = buildPrompt(minimal);
      expect(result.system).toBeDefined();
      expect(result.user).toBeDefined();
      // No unresolved placeholders even with empty optional fields
      expect(result.user).not.toMatch(/\{\{[^}]+\}\}/g);
    });

    it('selects quick template when mode is quick', () => {
      const result = buildPrompt(validInput);
      // Quick scan prompt should reference quick/fast analysis
      expect(result.system).toMatch(/quick|fast|concise/i);
    });
  });
});
