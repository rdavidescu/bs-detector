/**
 * Model Registry — Unit Tests (TDD)
 */
import {
  MODEL_CATALOG,
  MODEL_TAGS,
  getModelsForProvider,
  getDefaultModelId,
  findModel,
  formatModelLabel,
} from '../../src/shared/model-registry.js';
import { PROVIDERS } from '../../src/shared/config-loader.js';

describe('Model Registry', () => {

  describe('MODEL_CATALOG', () => {
    it('has entries for all three providers', () => {
      expect(MODEL_CATALOG[PROVIDERS.OPENROUTER]).toBeDefined();
      expect(MODEL_CATALOG[PROVIDERS.GEMINI]).toBeDefined();
      expect(MODEL_CATALOG[PROVIDERS.GROK]).toBeDefined();
    });

    it('each model has required fields: id, name, tags, context, note', () => {
      for (const provider of Object.values(PROVIDERS)) {
        for (const model of MODEL_CATALOG[provider]) {
          expect(model.id).toBeDefined();
          expect(typeof model.id).toBe('string');
          expect(model.name).toBeDefined();
          expect(Array.isArray(model.tags)).toBe(true);
          expect(typeof model.context).toBe('number');
          expect(typeof model.note).toBe('string');
        }
      }
    });

    it('each provider has exactly one default model', () => {
      for (const provider of Object.values(PROVIDERS)) {
        const defaults = MODEL_CATALOG[provider].filter((m) => m.default);
        expect(defaults).toHaveLength(1);
      }
    });

    it('tags are valid MODEL_TAGS values', () => {
      const validTags = new Set(Object.values(MODEL_TAGS));
      for (const provider of Object.values(PROVIDERS)) {
        for (const model of MODEL_CATALOG[provider]) {
          for (const tag of model.tags) {
            expect(validTags.has(tag)).toBe(true);
          }
        }
      }
    });
  });

  describe('getModelsForProvider', () => {
    it('returns models for openrouter', () => {
      const models = getModelsForProvider(PROVIDERS.OPENROUTER);
      expect(models.length).toBeGreaterThan(0);
    });

    it('returns empty array for unknown provider', () => {
      const models = getModelsForProvider('chatgpt');
      expect(models).toEqual([]);
    });
  });

  describe('getDefaultModelId', () => {
    it('returns default model ID for each provider', () => {
      expect(getDefaultModelId(PROVIDERS.OPENROUTER)).toBe('meta-llama/llama-3.3-70b-instruct');
      expect(getDefaultModelId(PROVIDERS.GEMINI)).toBe('gemini-2.5-flash');
      expect(getDefaultModelId(PROVIDERS.GROK)).toBe('grok-3-mini');
    });

    it('returns null for unknown provider', () => {
      expect(getDefaultModelId('chatgpt')).toBeNull();
    });
  });

  describe('findModel', () => {
    it('finds a model by provider and ID', () => {
      const model = findModel(PROVIDERS.GROK, 'grok-3');
      expect(model).not.toBeNull();
      expect(model.name).toBe('Grok 3');
    });

    it('returns null for non-existent model', () => {
      expect(findModel(PROVIDERS.GROK, 'grok-99')).toBeNull();
    });
  });

  describe('formatModelLabel', () => {
    it('formats tags in brackets before the name', () => {
      const label = formatModelLabel({
        name: 'Test Model',
        tags: [MODEL_TAGS.FREE, MODEL_TAGS.RECOMMENDED],
      });
      expect(label).toBe('[FREE] [RECOMMENDED] Test Model');
    });

    it('returns just the name when no tags', () => {
      const label = formatModelLabel({ name: 'Plain Model', tags: [] });
      expect(label).toBe('Plain Model');
    });
  });
});
