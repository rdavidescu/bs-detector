/**
 * BS Detector — Model Selector
 *
 * Builds a dropdown for each provider in settings that lets users
 * pick which AI model to use. Shows tags like [FREE], [RECOMMENDED]
 * and notes about pricing/limits.
 *
 * Stored in chrome.storage.local as {provider}Model (e.g. "openrouterModel").
 */

import {
  getModelsForProvider,
  getDefaultModelId,
  findModel,
  formatModelLabel,
} from '../shared/model-registry.js';

/** Storage key for a provider's selected model. */
function storageKey(provider) {
  return `${provider}Model`;
}

/**
 * Get the stored model ID for a provider, or null if not set.
 * @param {string} provider
 * @returns {Promise<string|null>}
 */
export async function getStoredModelId(provider) {
  const key = storageKey(provider);
  const result = await chrome.storage.local.get([key]);
  return result[key] || null;
}

/**
 * Get the active model ID for a provider (stored preference or default).
 * @param {string} provider
 * @returns {Promise<string>}
 */
export async function getActiveModelId(provider) {
  const stored = await getStoredModelId(provider);
  return stored || getDefaultModelId(provider);
}

/**
 * Build and populate a model selector dropdown for a provider.
 *
 * Expects the DOM to have:
 *   .model-select[data-provider="{provider}"]  — the <select>
 *   .model-note[data-provider="{provider}"]    — the note <p>
 *
 * @param {string} provider
 * @returns {Promise<void>}
 */
export async function buildModelSelector(provider) {
  const select = document.querySelector(`.model-select[data-provider="${provider}"]`);
  const noteEl = document.querySelector(`.model-note[data-provider="${provider}"]`);
  if (!select) return;

  const models = getModelsForProvider(provider);
  const activeId = await getActiveModelId(provider);

  // Populate options
  select.innerHTML = '';
  for (const model of models) {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = formatModelLabel(model);
    if (model.id === activeId) {
      option.selected = true;
    }
    select.appendChild(option);
  }

  // Show note for active model
  updateNote(noteEl, provider, activeId);

  // Wire change handler
  select.onchange = async () => {
    const key = storageKey(provider);
    await chrome.storage.local.set({ [key]: select.value });
    updateNote(noteEl, provider, select.value);
  };
}

/**
 * Update the note text under the dropdown.
 */
function updateNote(noteEl, provider, modelId) {
  if (!noteEl) return;
  const model = findModel(provider, modelId);
  noteEl.textContent = model?.note || '';
}
