# Chrome Extension Development Guide — BS Detector

**Audience:** Implementation team (developers who may be new to Chrome extensions)  
**Focus:** Manifest V3, developer mode workflow, and the path to Chrome Web Store  
**Date:** 2026-04-11

---

## 1. What Is a Chrome Extension?

A Chrome extension is a small program that runs inside the Chrome browser to modify or enhance the browsing experience. It's built with standard web technologies — HTML, CSS, JavaScript — packaged with a `manifest.json` file that tells Chrome what the extension does and what permissions it needs.

For BS Detector, the extension extracts page content, sends it to an AI provider, and shows the analysis result to the user — all without leaving the browser.

---

## 2. Manifest V3 — The Current Standard

Chrome extensions use **Manifest V3** (MV3), which is the required format for all new extensions as of 2024. Manifest V2 is no longer accepted by the Chrome Web Store.

Key things MV3 changed from the old world:

**Background pages → Service Workers.** Your background code runs in a service worker, not a persistent page. Service workers are ephemeral — Chrome can terminate them after ~30 seconds of inactivity. This means you cannot store state in memory and expect it to persist. Use `chrome.storage` for anything that needs to survive between wake-ups.

**No remote code.** You cannot load and execute JavaScript from a remote server. All code must be bundled with the extension. This is a security requirement — it means our prompt templates and logic must ship inside the extension package.

**`fetch()` instead of `XMLHttpRequest`.** Service workers don't have access to DOM APIs or `XMLHttpRequest`. Use the global `fetch()` for network requests (which is what we do for OpenRouter calls).

**Declarative permissions.** Permissions are declared upfront in `manifest.json`. For BS Detector we need:
- `activeTab` — access to the current tab when the user clicks our extension
- `storage` — save API keys and settings locally
- Host permissions for `https://openrouter.ai/*` — allows API calls from the service worker

---

## 3. Anatomy of Our Extension

```
bs-detector/
├── manifest.json              ← The brain: tells Chrome everything about the extension
├── background/
│   └── service-worker.js      ← Runs in the background, orchestrates everything
├── content/
│   └── content-script.js      ← Injected into web pages, extracts content
├── providers/
│   ├── provider-manager.js    ← Routes API calls to the right adapter
│   └── adapters/
│       └── openrouter.js      ← Talks to OpenRouter API
├── prompts/
│   ├── prompt-engine.js       ← Builds prompts from templates
│   └── templates/
│       └── quick.js           ← Quick Scan prompt template
├── shared/
│   ├── config.js              ← API key config (local, gitignored)
│   ├── response-parser.js     ← Parses AI responses
│   ├── score-calculator.js    ← Computes BS Score
│   ├── content-trimmer.js     ← Trims content to token budget
│   └── message-types.js       ← Message type constants
├── ui/
│   ├── popup.html             ← Extension popup interface
│   ├── popup.js               ← Popup logic
│   └── popup.css              ← Popup styles
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── tests/                     ← All test files (see testing-strategy.md)
├── config.example.js          ← Template for API key config
├── package.json
└── vitest.config.js
```

### 3.1 manifest.json — The Heart of the Extension

```json
{
  "manifest_version": 3,
  "name": "BS Detector",
  "version": "0.1.0",
  "description": "Analyze web content for credibility signals using your own AI.",
  "permissions": [
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "https://openrouter.ai/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content-script.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "ui/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

**Important notes:**
- `"type": "module"` on the service worker enables ES module imports
- `"run_at": "document_idle"` means the content script loads after the page is ready
- `"action"` replaces the old `"browser_action"` from MV2
- Content scripts match `<all_urls>` but are activated on demand (user clicks Analyze)

### 3.2 The Three Execution Contexts

A Chrome extension runs code in three separate contexts that **cannot directly access each other's variables**. They communicate via Chrome's messaging API.

```
┌────────────────────┐
│   Content Script    │  Runs IN the web page
│   (per tab)         │  Has DOM access, can read page content
│                     │  CANNOT access chrome.storage directly
│                     │  CANNOT make cross-origin fetch
└────────┬───────────┘
         │ chrome.runtime.sendMessage()
         ▼
┌────────────────────┐
│   Service Worker    │  Runs in background
│   (background)      │  NO DOM access
│                     │  CAN access chrome.storage
│                     │  CAN make fetch() to any host_permission URL
│                     │  Orchestrates everything
└────────┬───────────┘
         │ chrome.runtime.sendMessage()
         ▼
┌────────────────────┐
│   Popup             │  Runs when user clicks the extension icon
│   (ui/popup.html)   │  Has its own DOM (popup window)
│                     │  CAN access chrome.storage
│                     │  Disappears when user clicks away
└─────────────────────┘
```

**Golden rule:** Content script reads the page. Service worker does the heavy lifting. Popup shows results. They talk through messages.

### 3.3 Message Passing — How Components Talk

```javascript
// Content Script → Background
chrome.runtime.sendMessage({
  type: "ANALYZE_REQUEST",
  payload: { title, url, content }
});

// Background → Content Script (specific tab)
chrome.tabs.sendMessage(tabId, {
  type: "EXTRACT_CONTENT"
});

// Popup → Background
chrome.runtime.sendMessage({
  type: "TRIGGER_ANALYSIS",
  mode: "quick"
});

// Background → Popup (via response callback or port)
// Using chrome.runtime.onMessage listener in popup.js
```

**Important:** The popup lives only while it's open. If the user clicks away, the popup is destroyed. Any long-running operation should be managed by the service worker, which sends results back when the popup reopens.

---

## 4. Development Workflow

### 4.1 Setting Up the Dev Environment

```bash
# Clone the repo
git clone https://github.com/rdavidescu/bs-detector.git
cd bs-detector

# Install dependencies
npm install

# Copy config template and add your OpenRouter API key
cp config.example.js config.js
# Edit config.js → add your key
```

### 4.2 Loading the Extension in Developer Mode

This is the primary workflow for development. No Chrome Web Store needed.

**Step 1:** Open Chrome and navigate to `chrome://extensions`

**Step 2:** Enable **Developer mode** (toggle in the top right)

**Step 3:** Click **"Load unpacked"** and select the `bs-detector/` project folder

**Step 4:** The extension appears in the list with its icon. Pin it to the toolbar for easy access.

**Step 5:** You're live. Navigate to any page and click the extension icon.

### 4.3 Reloading After Code Changes

When you change code, the extension doesn't auto-reload. You have options:

**Manual reload:** Go to `chrome://extensions` → click the reload button (circular arrow) on your extension → then reload the web page you're testing on.

**Keyboard shortcut:** On the extensions page, click "Keyboard shortcuts" → assign a shortcut to "Reload this extension" (e.g., `Ctrl+Shift+R`).

**Auto-reload tool (recommended):** Use a dev tool like `web-ext` or `crx-hotreload` that watches for file changes and auto-reloads:

```bash
# Option 1: Mozilla's web-ext (works with Chrome too)
npm install -g web-ext
web-ext run --target=chromium --source-dir=./

# Option 2: Add a tiny reload script (dev only)
# Create a small watch script that calls chrome.runtime.reload()
```

### 4.4 Debugging

**Service worker:** Go to `chrome://extensions` → click "Inspect views: service worker" under your extension. Opens DevTools for the background script. Check Console for errors, Network tab for API calls.

**Content script:** Open DevTools on the web page (F12) → Console. Content script logs appear here. Look for messages prefixed with `[BS Detector]`.

**Popup:** Right-click the popup → "Inspect". Opens a separate DevTools window for the popup's DOM and JS.

**Common gotcha:** If the service worker shows as "Inactive", that's normal — it wakes up when a message is received. If it shows errors, click "Errors" to see the details.

### 4.5 Development Cycle (TDD)

Our project follows Test-Driven Development. The daily workflow looks like:

```
1. Pick a story from the board
2. Read the acceptance criteria and test cases
3. Write the failing tests first (Red)
4. Run tests in watch mode: npm run test:watch
5. Write the minimum code to make tests pass (Green)
6. Refactor while tests stay green
7. Load extension in Chrome → manual verify
8. Commit with descriptive message
9. Move story to Done
```

```bash
# Run all tests
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Run with coverage
npm run test:coverage

# Run only unit tests
npm test -- --dir tests/unit

# Run a specific test file
npm test -- tests/unit/score-calculator.test.js
```

---

## 5. Key Development Rules

### 5.1 Service Worker Gotchas

The service worker is the #1 source of confusion in MV3 development. Key rules:

**It will be killed.** Chrome terminates service workers after ~30 seconds of inactivity. Never store critical state in variables — use `chrome.storage.local` or `chrome.storage.session`.

**Keep it alive during API calls.** Use `chrome.runtime.onConnect` to keep a message port open while waiting for the OpenRouter response. The open port prevents Chrome from killing the worker mid-call.

```javascript
// In popup.js — keep a port open during analysis
const port = chrome.runtime.connect({ name: "analysis" });
port.postMessage({ type: "TRIGGER_ANALYSIS", mode: "quick" });
port.onMessage.addListener((msg) => {
  if (msg.type === "ANALYSIS_RESULT") {
    renderResult(msg.result);
    port.disconnect();
  }
});
```

**No DOM access.** The service worker cannot access `document`, `window`, or any DOM API. If you need DOM operations, that's the content script's job.

**ES Modules work.** With `"type": "module"` in the manifest, you can use `import`/`export` in the service worker. This is how we keep the codebase modular.

### 5.2 Content Script Isolation

Content scripts run in an "isolated world" — they share the page's DOM but have their own JavaScript scope. This means:

- You CAN read `document.body.innerText`
- You CANNOT access the page's JavaScript variables
- The page's JavaScript CANNOT access your extension's code
- This isolation is a security feature — never break it

### 5.3 CORS Is Not a Problem

API calls from the service worker bypass CORS restrictions entirely (as long as `host_permissions` are declared). You do NOT need a proxy server. Just `fetch()` directly to `https://openrouter.ai/api/v1/chat/completions`.

### 5.4 Never Commit API Keys

The `config.js` file with your OpenRouter API key must be in `.gitignore`. Ship `config.example.js` with placeholder instructions. For the walking skeleton, every developer creates their own local `config.js`.

---

## 6. Testing Chrome Extensions

Testing extensions has unique challenges because Chrome APIs aren't available in Node.js. Here's how we handle it:

### 6.1 Mock Chrome APIs

Create a mock object that simulates `chrome.runtime`, `chrome.storage`, and `chrome.tabs`:

```javascript
// tests/mocks/chrome-api.js
export const chrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    connect: vi.fn(() => ({
      postMessage: vi.fn(),
      onMessage: { addListener: vi.fn() },
      disconnect: vi.fn()
    }))
  },
  storage: {
    local: {
      get: vi.fn((keys) => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve())
    }
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([{ id: 1 }])),
    sendMessage: vi.fn()
  }
};

// Make it global for tests
globalThis.chrome = chrome;
```

### 6.2 Test Pure Logic Separately

Most of our code is pure functions (prompt engine, parser, score calculator, trimmer). These don't touch Chrome APIs at all — test them like any JavaScript module. That's why we keep business logic in `shared/` and `prompts/`, separate from Chrome-specific wiring.

### 6.3 Integration Tests with MSW

For API call testing, MSW (Mock Service Worker) intercepts `fetch()` requests and returns controlled responses. This lets us test the OpenRouter adapter without making real API calls:

```javascript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.post('https://openrouter.ai/api/v1/chat/completions', () => {
    return HttpResponse.json({
      choices: [{ message: { content: '{"bs_score": {"score": 42}}' } }]
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## 7. Path to Chrome Web Store (Post-MVP)

For the MVP, we develop and distribute in **developer mode only** (load unpacked). The Chrome Web Store submission is a post-MVP milestone, but it's good to know what's coming.

### 7.1 Requirements for Publishing

Before submitting to the Chrome Web Store:

- **Developer account:** Register at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) — one-time $5 fee
- **2-Step Verification:** Required on the Google account before publishing
- **Package:** ZIP file of the extension directory (no `node_modules`, no `tests/`, no `config.js`)
- **Assets needed:**
  - Extension icons (16×16, 48×48, 128×128 PNG)
  - Promotional images (440×280 small tile, 920×680 large tile — optional but recommended)
  - Screenshots (1280×800 or 640×400, at least 1, up to 5)
  - Detailed description (explain what the extension does, no keyword stuffing)
  - Privacy policy URL (required if the extension collects any data)
- **Single purpose declaration:** Chrome requires a clear statement of what the extension does
- **Category:** Productivity or News & Weather (best fits for BS Detector)

### 7.2 The Review Process

1. **Submit** the ZIP + metadata through the developer dashboard
2. **Review** by Chrome Web Store team (typically 1–3 business days, can take longer)
3. **Approval or rejection** — if rejected, you get feedback on what to fix
4. **Publishing** — once approved, you have 30 days to click "Publish" or the review expires
5. **Updates** — each update goes through review again

### 7.3 Common Rejection Reasons (and how to avoid them)

| Rejection Reason | How We Avoid It |
|-----------------|-----------------|
| Excessive permissions | We use `activeTab` (not `<all_urls>`), minimal `host_permissions` |
| Unclear purpose | Clear description: "Analyze web content for credibility signals" |
| Missing privacy policy | We need one — covers: no data collection, keys stored locally, AI calls to user's chosen provider |
| Remote code execution | All code is bundled locally — no remote scripts |
| Missing functionality | Extension must actually work as described |
| Misleading metadata | Accurate name, description, screenshots |

### 7.4 Packaging for Submission

```bash
# Create a clean build (exclude dev files)
mkdir -p dist
cp -r manifest.json background/ content/ providers/ prompts/ shared/ ui/ icons/ dist/

# Remove any dev-only files
rm -f dist/config.js
rm -rf dist/tests/

# ZIP it
cd dist && zip -r ../bs-detector.zip . && cd ..
```

For production builds (later phases), we'll use a proper build tool (Vite/Rollup) that bundles, minifies, and produces a clean `dist/` folder.

### 7.5 Distribution Alternatives (for MVP)

During MVP and early testing, there are ways to distribute without the Chrome Web Store:

- **Load unpacked (developer mode):** Primary method for the team. Each developer loads from the repo clone.
- **Share the ZIP:** Package the extension as a `.zip` and share it. Other developers extract and load unpacked.
- **Self-hosted CRX (enterprise only):** Not relevant for us, but enterprises can host their own extension packages.

---

## 8. Manifest V3 Quick Reference

### 8.1 Key APIs We Use

| API | What It Does | Where We Use It |
|-----|-------------|-----------------|
| `chrome.runtime.sendMessage()` | Send message between contexts | Content ↔ Background ↔ Popup |
| `chrome.runtime.onMessage` | Listen for messages | All contexts |
| `chrome.runtime.connect()` | Open persistent port | Popup ↔ Background (keep alive during analysis) |
| `chrome.storage.local` | Persistent local storage | API keys, settings |
| `chrome.tabs.query()` | Get active tab info | Background → find current tab |
| `chrome.tabs.sendMessage()` | Send message to specific tab | Background → Content Script |
| `chrome.action.setBadgeText()` | Show text on extension icon | Future: show score on badge |
| `fetch()` | HTTP requests | Service worker → OpenRouter API |

### 8.2 Permissions Explained

| Permission | Why We Need It | Risk Level |
|-----------|---------------|------------|
| `activeTab` | Access current tab content when user clicks extension | Low — only active tab, only on user gesture |
| `storage` | Store API keys and settings locally | Low — local only, not synced |
| `host_permissions: openrouter.ai` | Make API calls to OpenRouter | Medium — Chrome shows this in install prompt |

### 8.3 Lifecycle Events

```javascript
// Service worker installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First install — maybe set default settings
  } else if (details.reason === 'update') {
    // Extension updated — maybe migrate storage
  }
});

// Extension icon clicked (if no popup is set)
chrome.action.onClicked.addListener((tab) => {
  // Only fires if "default_popup" is NOT set in manifest
});

// Keep alive during long operations
chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((msg) => {
    // Handle long-running analysis request
  });
});
```

---

## 9. Troubleshooting Common Issues

### "Service worker registration failed"
- Check `manifest.json` → `background.service_worker` path is correct
- Check for syntax errors in the service worker file
- Check DevTools console on `chrome://extensions`

### "Cannot use import statement outside a module"
- Add `"type": "module"` to the `background` section in `manifest.json`
- Content scripts do NOT support ES modules — use a bundler or IIFE pattern for content scripts

### "Unchecked runtime.lastError: Could not establish connection"
- The content script isn't loaded yet — happens if you send a message before the page loads
- Use `chrome.tabs.sendMessage` with a callback and check `chrome.runtime.lastError`

### "Extension popup closes when I click elsewhere"
- That's by design. Popups are ephemeral. Long-running operations must be in the service worker.

### "Fetch failed" or "Network error" from service worker
- Check `host_permissions` in manifest — the domain you're calling must be listed
- Check the URL is HTTPS (not HTTP)
- Check the API key is valid

### "Content script doesn't run"
- Check `content_scripts.matches` in manifest — must match the page URL pattern
- Check `run_at` — try `document_idle` if the page hasn't fully loaded
- Check the Chrome DevTools console on the page for errors

---

## 10. Recommended Learning Path

For developers new to Chrome extensions:

1. **Read the official guide:** [Chrome Extensions Getting Started](https://developer.chrome.com/docs/extensions/get-started) — build their tutorial extension (~1 hour)
2. **Understand message passing:** This is the core pattern. Practice sending messages between content script, service worker, and popup
3. **Study our manifest.json:** Understand every field and why it's there
4. **Run our tests:** `npm test` — see how we mock Chrome APIs and test in isolation
5. **Load the walking skeleton:** Once it's built, load it in dev mode, add `console.log` at each chain step, and watch the flow in DevTools

---

## 11. Reference Links

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions)
- [Manifest V3 Overview](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [Chrome Extensions API Reference](https://developer.chrome.com/docs/extensions/reference/api)
- [Chrome Web Store Publishing Guide](https://developer.chrome.com/docs/webstore/publish)
- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- [OpenRouter API Documentation](https://openrouter.ai/docs)
