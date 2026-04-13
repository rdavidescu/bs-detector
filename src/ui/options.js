/**
 * BS Detector — Settings Page Logic
 *
 * Manages provider selection, API key storage, and UI state.
 * Uses chrome.storage.local for persistence.
 */

import {
  PROVIDERS,
  validateApiKey,
  loadConfig,
  migrateOldConfig,
} from '../shared/config-loader.js';
import { buildModelSelector } from './model-selector.js';

// Storage key map (provider name → chrome.storage key)
const KEY_MAP = {
  [PROVIDERS.OPENROUTER]: 'openrouterApiKey',
  [PROVIDERS.GEMINI]: 'geminiApiKey',
  [PROVIDERS.GROK]: 'grokApiKey',
};

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
  // Migrate old config first (safe to call always)
  await migrateOldConfig();

  // Show extension version
  const versionEl = document.getElementById('version');
  if (versionEl && chrome.runtime?.getManifest) {
    versionEl.textContent = `v${chrome.runtime.getManifest().version}`;
  }

  // Load current config and render state
  await refreshUI();

  // Wire up event listeners
  attachListeners();
});

// ---------------------------------------------------------------------------
// UI Refresh
// ---------------------------------------------------------------------------

async function refreshUI() {
  const config = await loadConfig();
  const hasAnyKey = config.openrouterApiKey || config.geminiApiKey || config.grokApiKey;

  // Show/hide getting-started banner
  const banner = document.getElementById('getting-started');
  if (banner) {
    banner.style.display = hasAnyKey ? 'none' : 'block';
  }

  // Update each provider card
  for (const [provider, storageKey] of Object.entries(KEY_MAP)) {
    const card = document.querySelector(`.provider-card[data-provider="${provider}"]`);
    if (!card) continue;

    const radio = card.querySelector('input[type="radio"]');
    const status = card.querySelector('.provider-status');
    const keyInput = card.querySelector('.key-input');
    const key = config[storageKey];

    // Radio selection
    if (radio) {
      radio.checked = config.activeProvider === provider;
    }

    // Active card highlight
    card.classList.toggle('active', config.activeProvider === provider);

    // Status badge
    if (status) {
      if (config.activeProvider === provider && key) {
        status.dataset.status = 'active';
        status.textContent = 'Active';
      } else if (key) {
        status.dataset.status = 'configured';
        status.textContent = 'Configured';
      } else {
        status.dataset.status = 'not-configured';
        status.textContent = 'Not configured';
      }
    }

    // Show masked key if saved (don't expose actual key in the input)
    if (keyInput && key) {
      keyInput.value = maskKey(key);
      keyInput.dataset.saved = 'true';
    } else if (keyInput) {
      keyInput.value = '';
      keyInput.dataset.saved = '';
    }

    // Model selector — show only when provider has a key
    const modelWrapper = card.querySelector('.model-selector-wrapper');
    if (modelWrapper) {
      if (key) {
        modelWrapper.style.display = '';
        await buildModelSelector(provider);
      } else {
        modelWrapper.style.display = 'none';
      }
    }
  }
}

function maskKey(key) {
  if (key.length <= 8) return '****';
  return key.slice(0, 6) + '...' + key.slice(-4);
}

// ---------------------------------------------------------------------------
// Event Listeners
// ---------------------------------------------------------------------------

function attachListeners() {
  // Radio buttons — switch active provider
  document.querySelectorAll('input[name="active-provider"]').forEach((radio) => {
    radio.addEventListener('change', async (e) => {
      await chrome.storage.local.set({ activeProvider: e.target.value });
      await refreshUI();
      showToast('Provider switched to ' + e.target.value, 'success');
    });
  });

  // Show/Hide toggle buttons
  document.querySelectorAll('.toggle-visibility').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'Hide';
      } else {
        input.type = 'password';
        btn.textContent = 'Show';
      }
    });
  });

  // Save buttons
  document.querySelectorAll('.save-key').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const provider = btn.dataset.provider;
      const input = document.getElementById(`key-${provider}`);
      if (!input) return;

      const key = input.value.trim();

      // Don't save a masked key
      if (input.dataset.saved === 'true' && key === maskKey(key)) {
        showToast('Enter a new key to save', 'error');
        return;
      }

      const validation = validateApiKey(key, provider);
      if (!validation.valid) {
        showToast(validation.error, 'error');
        return;
      }

      const storageKey = KEY_MAP[provider];
      if (!storageKey) return;

      await chrome.storage.local.set({ [storageKey]: key });
      await refreshUI();
      showToast(`${provider} key saved`, 'success');
    });
  });

  // Delete buttons
  document.querySelectorAll('.delete-key').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const provider = btn.dataset.provider;
      const storageKey = KEY_MAP[provider];
      if (!storageKey) return;

      await chrome.storage.local.remove([storageKey]);

      // If we just deleted the active provider's key, reset to first available
      const config = await loadConfig();
      if (config.activeProvider === provider) {
        // Find another configured provider, or stick with openrouter
        const fallback = Object.entries(KEY_MAP).find(
          ([p, sk]) => p !== provider && config[sk]
        );
        if (fallback) {
          await chrome.storage.local.set({ activeProvider: fallback[0] });
        }
      }

      await refreshUI();
      showToast(`${provider} key deleted`, 'success');
    });
  });
}

// ---------------------------------------------------------------------------
// Toast notifications
// ---------------------------------------------------------------------------

function showToast(message, type = 'success') {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger show
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto-hide after 2.5s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 200);
  }, 2500);
}
