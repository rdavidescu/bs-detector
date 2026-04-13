/**
 * Model Selector in Settings — Unit Tests (TDD)
 *
 * Tests the model dropdown that appears under each provider card.
 */
import { PROVIDERS } from '../../src/shared/config-loader.js';
import { MODEL_CATALOG } from '../../src/shared/model-registry.js';
import { resetChromeMocks } from '../mocks/chrome-api.js';
import { buildModelSelector, getStoredModelId } from '../../src/ui/model-selector.js';

function createProviderCard(provider) {
  const card = document.createElement('div');
  card.className = 'provider-card';
  card.dataset.provider = provider;
  card.innerHTML = `
    <div class="model-selector-wrapper" data-provider="${provider}">
      <label>Model:</label>
      <select class="model-select" data-provider="${provider}"></select>
      <p class="model-note" data-provider="${provider}"></p>
    </div>
  `;
  document.body.appendChild(card);
  return card;
}

describe('Model Selector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    resetChromeMocks();
  });

  describe('buildModelSelector', () => {
    it('populates select with all models for the provider', async () => {
      createProviderCard('openrouter');
      await buildModelSelector('openrouter');

      const select = document.querySelector('.model-select[data-provider="openrouter"]');
      const options = select.querySelectorAll('option');
      expect(options.length).toBe(MODEL_CATALOG[PROVIDERS.OPENROUTER].length);
    });

    it('uses formatModelLabel for option text (tags in brackets)', async () => {
      createProviderCard('gemini');
      await buildModelSelector('gemini');

      const select = document.querySelector('.model-select[data-provider="gemini"]');
      const firstOption = select.options[0];
      // First Gemini model has [FREE] [RECOMMENDED] tags
      expect(firstOption.textContent).toContain('[FREE]');
      expect(firstOption.textContent).toContain('[RECOMMENDED]');
    });

    it('selects the default model when no stored preference', async () => {
      createProviderCard('grok');
      await buildModelSelector('grok');

      const select = document.querySelector('.model-select[data-provider="grok"]');
      expect(select.value).toBe('grok-3-mini');
    });

    it('selects stored model when user has a preference', async () => {
      await chrome.storage.local.set({ grokModel: 'grok-3' });
      createProviderCard('grok');
      await buildModelSelector('grok');

      const select = document.querySelector('.model-select[data-provider="grok"]');
      expect(select.value).toBe('grok-3');
    });

    it('shows model note text below the dropdown', async () => {
      createProviderCard('gemini');
      await buildModelSelector('gemini');

      const note = document.querySelector('.model-note[data-provider="gemini"]');
      expect(note.textContent.length).toBeGreaterThan(0);
      // Default gemini model note mentions free
      expect(note.textContent.toLowerCase()).toContain('free');
    });

    it('saves model selection to storage on change', async () => {
      createProviderCard('openrouter');
      await buildModelSelector('openrouter');

      const select = document.querySelector('.model-select[data-provider="openrouter"]');
      select.value = 'meta-llama/llama-3.3-70b-instruct:free';
      select.dispatchEvent(new Event('change'));

      const stored = await chrome.storage.local.get(['openrouterModel']);
      expect(stored.openrouterModel).toBe('meta-llama/llama-3.3-70b-instruct:free');
    });

    it('updates note when selection changes', async () => {
      createProviderCard('grok');
      await buildModelSelector('grok');

      const note = document.querySelector('.model-note[data-provider="grok"]');
      // Default is grok-3-mini, note mentions "$0.30"
      expect(note.textContent).toContain('$0.30');

      const select = document.querySelector('.model-select[data-provider="grok"]');
      select.value = 'grok-3';
      select.dispatchEvent(new Event('change'));

      // onchange is async — flush microtasks so updateNote runs
      await new Promise((r) => setTimeout(r, 0));

      // Now note should show grok-3's note with "$3"
      expect(note.textContent).toContain('$3');
    });
  });

  describe('getStoredModelId', () => {
    it('returns stored model ID for provider', async () => {
      await chrome.storage.local.set({ geminiModel: 'gemini-2.5-pro' });
      const id = await getStoredModelId('gemini');
      expect(id).toBe('gemini-2.5-pro');
    });

    it('returns null when no model stored', async () => {
      const id = await getStoredModelId('gemini');
      expect(id).toBeNull();
    });
  });
});
