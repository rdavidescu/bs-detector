/**
 * Popup Provider Selector — Unit Tests (TDD)
 *
 * Tests the dropdown that lets users switch providers from the popup,
 * visible only when 2+ providers are configured.
 */
import { resetChromeMocks } from '../mocks/chrome-api.js';

/**
 * Helper: builds a minimal popup DOM with the provider-selector container.
 * The real popup.html has this element; tests simulate it here.
 */
function createPopupDOM() {
  document.body.innerHTML = `
    <div id="app">
      <div class="header">
        <h1>BS Detector</h1>
        <div class="header-right">
          <span id="status" class="status">Ready</span>
          <button id="settings-btn" class="settings-btn" title="Settings"></button>
        </div>
      </div>
      <div id="provider-selector-wrapper" class="provider-selector-wrapper" style="display:none;">
        <select id="provider-selector" class="provider-selector">
        </select>
      </div>
      <button id="analyze-btn">Analyze This Page</button>
    </div>
  `;
}

/**
 * Imports and calls the module function that populates the selector.
 * We import the standalone helper so tests don't need to boot the full popup.
 */
import {
  buildProviderSelector,
  getConfiguredProviders,
} from '../../src/ui/popup-provider-selector.js';

describe('Popup Provider Selector', () => {
  beforeEach(() => {
    resetChromeMocks();
    createPopupDOM();
  });

  describe('getConfiguredProviders', () => {
    it('returns empty array when no keys are stored', async () => {
      const result = await getConfiguredProviders();
      expect(result).toEqual([]);
    });

    it('returns only providers that have a key stored', async () => {
      // Seed storage with openrouter and grok keys
      await chrome.storage.local.set({
        openrouterApiKey: 'sk-or-test123',
        grokApiKey: 'xai-test456',
      });

      const result = await getConfiguredProviders();
      expect(result).toContain('openrouter');
      expect(result).toContain('grok');
      expect(result).not.toContain('gemini');
    });

    it('returns all three when all have keys', async () => {
      await chrome.storage.local.set({
        openrouterApiKey: 'sk-or-test',
        geminiApiKey: 'AIzaTest',
        grokApiKey: 'xai-test',
      });

      const result = await getConfiguredProviders();
      expect(result).toHaveLength(3);
    });
  });

  describe('buildProviderSelector', () => {
    it('hides wrapper when only 1 provider is configured', async () => {
      await chrome.storage.local.set({
        openrouterApiKey: 'sk-or-test',
        activeProvider: 'openrouter',
      });

      await buildProviderSelector();

      const wrapper = document.getElementById('provider-selector-wrapper');
      expect(wrapper.style.display).toBe('none');
    });

    it('hides wrapper when 0 providers are configured', async () => {
      await buildProviderSelector();

      const wrapper = document.getElementById('provider-selector-wrapper');
      expect(wrapper.style.display).toBe('none');
    });

    it('shows wrapper when 2+ providers are configured', async () => {
      await chrome.storage.local.set({
        openrouterApiKey: 'sk-or-test',
        geminiApiKey: 'AIzaTest',
        activeProvider: 'openrouter',
      });

      await buildProviderSelector();

      const wrapper = document.getElementById('provider-selector-wrapper');
      expect(wrapper.style.display).not.toBe('none');
    });

    it('populates select with only configured providers', async () => {
      await chrome.storage.local.set({
        openrouterApiKey: 'sk-or-test',
        grokApiKey: 'xai-test',
        activeProvider: 'openrouter',
      });

      await buildProviderSelector();

      const select = document.getElementById('provider-selector');
      const options = select.querySelectorAll('option');
      expect(options).toHaveLength(2);

      const values = [...options].map((o) => o.value);
      expect(values).toContain('openrouter');
      expect(values).toContain('grok');
      expect(values).not.toContain('gemini');
    });

    it('sets active provider as the selected value', async () => {
      await chrome.storage.local.set({
        openrouterApiKey: 'sk-or-test',
        geminiApiKey: 'AIzaTest',
        activeProvider: 'gemini',
      });

      await buildProviderSelector();

      const select = document.getElementById('provider-selector');
      expect(select.value).toBe('gemini');
    });

    it('uses friendly display names for options', async () => {
      await chrome.storage.local.set({
        openrouterApiKey: 'sk-or-test',
        geminiApiKey: 'AIzaTest',
        grokApiKey: 'xai-test',
        activeProvider: 'openrouter',
      });

      await buildProviderSelector();

      const select = document.getElementById('provider-selector');
      const texts = [...select.options].map((o) => o.textContent);
      expect(texts).toContain('OpenRouter');
      expect(texts).toContain('Google Gemini');
      expect(texts).toContain('Grok (xAI)');
    });

    it('updates activeProvider in storage when selection changes', async () => {
      await chrome.storage.local.set({
        openrouterApiKey: 'sk-or-test',
        geminiApiKey: 'AIzaTest',
        activeProvider: 'openrouter',
      });

      await buildProviderSelector();

      const select = document.getElementById('provider-selector');
      // Simulate user switching to gemini
      select.value = 'gemini';
      select.dispatchEvent(new Event('change'));

      // Check storage was updated
      const stored = await chrome.storage.local.get(['activeProvider']);
      expect(stored.activeProvider).toBe('gemini');
    });
  });
});
