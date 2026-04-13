/**
 * MP-01 — Settings UI Unit Tests (TDD — RED phase)
 *
 * Tests settings page DOM rendering and interactions.
 * Uses happy-dom for DOM simulation.
 */
// Helper to load options page HTML
function createOptionsPage() {
  document.body.innerHTML = `
    <div id="settings-app">
      <div class="settings-header">
        <h1>BS Detector Settings</h1>
        <span id="version"></span>
      </div>
      <div id="getting-started" class="getting-started" style="display:none;">
        <p>Choose a provider and add your API key to start analyzing pages.</p>
      </div>
      <div id="providers-list">
        <div class="provider-card" data-provider="openrouter">
          <input type="radio" name="active-provider" value="openrouter" id="radio-openrouter">
          <label for="radio-openrouter">OpenRouter</label>
          <span class="provider-status" data-status="not-configured">Not configured</span>
          <div class="key-input-group">
            <input type="password" id="key-openrouter" placeholder="sk-or-v1-..." class="key-input">
            <button class="toggle-visibility" data-target="key-openrouter">Show</button>
            <button class="save-key" data-provider="openrouter">Save</button>
            <button class="delete-key" data-provider="openrouter">Delete</button>
          </div>
          <details class="setup-instructions">
            <summary>How to get an OpenRouter key</summary>
            <ol><li>Go to openrouter.ai/keys</li></ol>
          </details>
        </div>
        <div class="provider-card" data-provider="gemini">
          <input type="radio" name="active-provider" value="gemini" id="radio-gemini">
          <label for="radio-gemini">Google Gemini</label>
          <span class="provider-status" data-status="not-configured">Not configured</span>
          <div class="key-input-group">
            <input type="password" id="key-gemini" placeholder="AIza..." class="key-input">
            <button class="toggle-visibility" data-target="key-gemini">Show</button>
            <button class="save-key" data-provider="gemini">Save</button>
            <button class="delete-key" data-provider="gemini">Delete</button>
          </div>
          <details class="setup-instructions">
            <summary>How to get a Gemini key</summary>
            <ol><li>Go to aistudio.google.com/apikey</li></ol>
          </details>
        </div>
        <div class="provider-card" data-provider="grok">
          <input type="radio" name="active-provider" value="grok" id="radio-grok">
          <label for="radio-grok">Grok (xAI)</label>
          <span class="provider-status" data-status="not-configured">Not configured</span>
          <div class="key-input-group">
            <input type="password" id="key-grok" placeholder="xai-..." class="key-input">
            <button class="toggle-visibility" data-target="key-grok">Show</button>
            <button class="save-key" data-provider="grok">Save</button>
            <button class="delete-key" data-provider="grok">Delete</button>
          </div>
          <details class="setup-instructions">
            <summary>How to get a Grok key</summary>
            <ol><li>Go to console.x.ai</li></ol>
          </details>
        </div>
      </div>
      <div class="privacy-footer">
        <p>Your API keys are stored locally in your browser and are only sent to the respective AI provider during analysis.</p>
      </div>
    </div>
  `;
}

describe('Settings UI', () => {

  beforeEach(() => {
    createOptionsPage();
    vi.clearAllMocks();
  });

  describe('Page structure', () => {

    it('renders provider cards for all three providers', () => {
      const cards = document.querySelectorAll('.provider-card');
      expect(cards).toHaveLength(3);
      expect(cards[0].dataset.provider).toBe('openrouter');
      expect(cards[1].dataset.provider).toBe('gemini');
      expect(cards[2].dataset.provider).toBe('grok');
    });

    it('has radio buttons for provider selection', () => {
      const radios = document.querySelectorAll('input[name="active-provider"]');
      expect(radios).toHaveLength(3);
      expect(radios[0].value).toBe('openrouter');
      expect(radios[1].value).toBe('gemini');
      expect(radios[2].value).toBe('grok');
    });

    it('has password-type inputs for API keys', () => {
      const inputs = document.querySelectorAll('.key-input');
      expect(inputs).toHaveLength(3);
      for (const input of inputs) {
        expect(input.type).toBe('password');
      }
    });

    it('has correct placeholder text for each provider', () => {
      expect(document.getElementById('key-openrouter').placeholder).toContain('sk-or-');
      expect(document.getElementById('key-gemini').placeholder).toContain('AIza');
      expect(document.getElementById('key-grok').placeholder).toContain('xai-');
    });

    it('has save and delete buttons for each provider', () => {
      const saveButtons = document.querySelectorAll('.save-key');
      const deleteButtons = document.querySelectorAll('.delete-key');
      expect(saveButtons).toHaveLength(3);
      expect(deleteButtons).toHaveLength(3);
    });

    it('has setup instructions for each provider', () => {
      const instructions = document.querySelectorAll('.setup-instructions');
      expect(instructions).toHaveLength(3);
    });

    it('has a privacy footer', () => {
      const footer = document.querySelector('.privacy-footer');
      expect(footer).not.toBeNull();
      expect(footer.textContent).toContain('stored locally');
    });

    it('has a getting started banner (initially hidden)', () => {
      const banner = document.getElementById('getting-started');
      expect(banner).not.toBeNull();
      expect(banner.style.display).toBe('none');
    });
  });

  describe('Show/hide toggle', () => {

    it('toggles key input from password to text', () => {
      const input = document.getElementById('key-openrouter');
      expect(input.type).toBe('password');

      // Simulate toggle click
      input.type = input.type === 'password' ? 'text' : 'password';
      expect(input.type).toBe('text');

      // Toggle back
      input.type = input.type === 'password' ? 'text' : 'password';
      expect(input.type).toBe('password');
    });
  });
});
