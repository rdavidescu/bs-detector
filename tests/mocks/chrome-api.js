/**
 * Chrome API mock — loaded as vitest setup file.
 *
 * Provides minimal stubs for chrome.runtime, chrome.storage, chrome.tabs
 * so unit tests can run without a real browser environment.
 *
 * Each test can override specific behaviors via vi.fn() on these stubs.
 */

const storageStore = {};

const chromeMock = {
  runtime: {
    sendMessage: vi.fn((_message, callback) => {
      if (callback) callback();
      return Promise.resolve();
    }),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(() => false)
    },
    onConnect: {
      addListener: vi.fn()
    },
    connect: vi.fn(() => ({
      onDisconnect: { addListener: vi.fn() },
      postMessage: vi.fn()
    })),
    getURL: vi.fn((path) => `chrome-extension://mock-id/${path}`),
    lastError: null
  },

  storage: {
    local: {
      get: vi.fn((keys, callback) => {
        const result = {};
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const key of keyList) {
          if (storageStore[key] !== undefined) {
            result[key] = storageStore[key];
          }
        }
        if (callback) callback(result);
        return Promise.resolve(result);
      }),
      set: vi.fn((items, callback) => {
        Object.assign(storageStore, items);
        if (callback) callback();
        return Promise.resolve();
      }),
      remove: vi.fn((keys, callback) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const key of keyList) {
          delete storageStore[key];
        }
        if (callback) callback();
        return Promise.resolve();
      })
    },
    sync: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve())
    }
  },

  tabs: {
    query: vi.fn(() => Promise.resolve([{ id: 1, url: 'https://example.com' }])),
    sendMessage: vi.fn((_tabId, _message, callback) => {
      if (callback) callback();
      return Promise.resolve();
    })
  },

  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn()
  }
};

// Expose globally so extension code can reference `chrome.*`
globalThis.chrome = chromeMock;

// Helper: reset all mocks between tests
export function resetChromeMocks() {
  Object.keys(storageStore).forEach((key) => delete storageStore[key]);
  vi.clearAllMocks();
}

export { chromeMock };
