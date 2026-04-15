# BS Detector — Chrome Web Store Publishing Guide

## Phase 1: Developer Account Setup

- [ ] **Register as Chrome Web Store developer** at https://chrome.google.com/webstore/devconsole
- [ ] Pay the **one-time $5 registration fee** (Google account required)
- [ ] Verify your email address
- [ ] If publishing under a company/org, set up a **Group Publisher** (optional, can do later)

## Phase 2: Store Listing Assets

You need these before you can submit:

### Required assets

| Asset | Spec | Status |
|-------|------|--------|
| Extension icon 128x128 | PNG, no alpha required | DONE (src/icons/icon-128.png) |
| Store icon 128x128 | PNG, displayed in store listing | DONE (same file works) |
| Screenshot 1280x800 or 640x400 | PNG or JPG, at least 1, max 5 | NEEDED |
| Short description | Max 132 characters | DONE in manifest |
| Detailed description | No hard limit, ~500-1000 words recommended | NEEDED |
| Category | Select from Chrome Web Store categories | "Productivity" or "News & Weather" |
| Language | Primary language | English |

### Recommended assets

| Asset | Spec | Notes |
|-------|------|-------|
| Promo tile small 440x280 | PNG or JPG | Shown in store search results |
| Promo tile large 920x680 | PNG or JPG | Featured listings |
| Marquee 1400x560 | PNG or JPG | Only if featured by Google |

### Screenshots checklist

Take these from the actual extension running in Chrome:

- [ ] **Screenshot 1**: Popup idle state with provider dropdown visible
- [ ] **Screenshot 2**: Analysis in progress (funny loading message visible)
- [ ] **Screenshot 3**: Results — low BS score with "careful" badge, no claim hazard (clean article)
- [ ] **Screenshot 4**: Results — medium BS score with claim hazard section visible (the money shot)
- [ ] **Screenshot 5**: Options/Settings page with API key configuration

How to capture: right-click the popup > Inspect > Device toolbar > set to 1280x800 > screenshot. Or use a Chrome screenshot extension.

### Store description draft

```
BS Detector — AI-powered content credibility analysis

Stop and think before you believe. BS Detector analyzes how web articles 
present information, scoring presentation quality and flagging claim hazards 
separately — so you always know WHERE the problem is.

TWO-AXIS ANALYSIS:
• Presentation BS Score (0-100): Measures evidence weakness, context loss, 
  certainty inflation, emotional pressure, and source transparency
• Claim Hazard (none/low/moderate/high): Flags whether the claims themselves 
  are disputed, conspiratorial, unverifiable, or polarizing — independent of 
  how well the article is written

BRING YOUR OWN AI:
Works with your own API keys — no data sent to us, ever.
• OpenRouter (access to 100+ models including Claude, Llama, Mistral)
• Google Gemini
• Grok (xAI)

Free models available — start analyzing at zero cost.

FEATURES:
• One-click analysis from any web page
• SVG score gauge with green-to-brown palette
• Component score breakdown with visual bars
• Red flags list
• Main claims extraction
• YouTube support (description + transcript analysis)
• Works on news sites, blogs, forums, and video pages

PRIVACY:
• Your API keys stay in your browser (chrome.storage.local)
• No telemetry, no tracking, no data collection
• Content is sent directly from your browser to your chosen AI provider
• We never see your browsing data or analysis results

BS Detector is open source: https://github.com/rdavidescu/bs-detector

Scores are estimates, not verdicts. Think for yourself — we just help you 
see the patterns.
```

## Phase 3: Pre-Submission Code Review

Before packaging, verify these:

- [ ] **manifest.json version** is correct (currently 0.3.0, bump to 1.0.0 for store?)
- [ ] **Permissions are minimal** — currently `activeTab` + `storage` (good, minimal)
- [ ] **host_permissions** are justified — 3 API endpoints only (good)
- [ ] **content_scripts matches `<all_urls>`** — this will trigger extra review from Google. It's required for the extension to work on any page, but be ready to justify it in the review notes
- [ ] **No remote code loading** — all JS is bundled locally (good, MV3 compliant)
- [ ] **No eval()** or dynamic code execution (good)
- [ ] **config.js with API keys is gitignored** — verify it's not in the package
- [ ] **No console.log spam** in production code (clean up any debug logs)

### Content Security Policy

The current manifest doesn't specify a CSP — MV3 applies a strict default. This is fine. Do NOT add a relaxed CSP unless you absolutely need it.

### The `<all_urls>` review flag

Google's review team flags extensions with `<all_urls>` content script matching. To pass review faster, add a **"Single Purpose" description** in the developer console explaining: "The extension injects a content script to extract article text from any page the user actively chooses to analyze. No data is collected automatically — extraction only happens when the user clicks 'Analyze This Page'."

## Phase 4: Package the Extension

### Option A: ZIP from file explorer (easiest)

1. Open `bs-detector/src/` folder
2. Select ALL files inside `src/` (not the `src/` folder itself)
3. Right-click > Send to > Compressed (zipped) folder
4. Rename to `bs-detector-v1.0.0.zip`

The ZIP should contain at its root level:
```
manifest.json
config.example.js
background/
content/
icons/
prompts/
providers/
shared/
ui/
```

### Option B: Command line

```powershell
cd C:\Users\rdavi\Claude\github\bs-detector\src
# Exclude config.js (contains real API keys)
7z a -tzip ..\bs-detector-v1.0.0.zip * -xr!config.js
```

### What NOT to include in the ZIP

- `node_modules/`
- `tests/`
- `docs/`
- `scripts/`
- `.git/`
- `package.json`
- `eslint.config.js`
- `vitest.config.js`
- `config.js` (real API keys!)
- Any dotfiles (`.gitignore`, `.eslintrc`, etc.)

Only the `src/` folder contents go in the ZIP.

### Important: config.js handling

The extension needs `config.js` to exist for imports, but it should be empty/template in the published version. Users configure their keys through the Options page which saves to `chrome.storage.local`. Make sure:

- [ ] `config.js` either doesn't exist in ZIP (if options page handles everything) or contains only empty/placeholder values
- [ ] `config.example.js` is included as reference

## Phase 5: Submit to Chrome Web Store

1. Go to https://chrome.google.com/webstore/devconsole
2. Click **"New Item"**
3. Upload your ZIP file
4. Fill in the store listing:
   - **Name**: BS Detector
   - **Short description**: from manifest (132 char max)
   - **Detailed description**: from draft above
   - **Category**: Productivity (or News & Weather)
   - **Language**: English
5. Upload screenshots (at least 1)
6. Upload promo images (optional but recommended)
7. **Privacy practices tab**:
   - Single purpose: "Analyzes web page content credibility using user-provided AI services"
   - Data usage: "This extension does not collect or transmit user data to any server owned by the developer"
   - Permissions justification:
     - `activeTab`: "Required to extract article text from the page the user chooses to analyze"
     - `storage`: "Required to persist user's API keys and provider preferences locally"
     - `host_permissions` (3 API URLs): "Required to send content to the user's chosen AI provider for analysis"
   - Remote code: No
   - Data collection: None
8. **Distribution tab**:
   - Visibility: Public (or Unlisted for beta testing first)
   - Regions: All regions (or specific ones)
9. Click **"Submit for Review"**

## Phase 6: Review Process

- **Timeline**: Usually 1-3 business days, but can take up to 2 weeks for first submission
- **Common rejection reasons**:
  - `<all_urls>` without clear justification → fix with Single Purpose description
  - Missing privacy policy → see below
  - Description doesn't match functionality → make sure description is accurate
  - Unused permissions → we're clean on this
- **If rejected**: Google tells you why. Fix and resubmit. Second reviews are usually faster.

### Privacy Policy (required if you use `<all_urls>`)

You need a hosted privacy policy URL. Simplest approach:

- [ ] Create a `PRIVACY.md` in the repo
- [ ] It renders as a page at: `https://github.com/rdavidescu/bs-detector/blob/main/PRIVACY.md`
- [ ] Use that URL in the developer console

Privacy policy should state:
- What data the extension accesses (page text, only when user clicks analyze)
- Where data goes (directly to user's chosen AI provider, never to developer)
- What is stored locally (API keys, provider preferences — all in chrome.storage.local)
- What is NOT collected (no telemetry, no browsing history, no personal data)
- Contact info for privacy questions

## Phase 7: Post-Launch

- [ ] **Monitor reviews** in the developer console
- [ ] **Set up user feedback channel** — GitHub Issues is fine for v1
- [ ] **Version bumping**: bump `manifest.json` version, re-ZIP, upload new version in dev console
- [ ] **Auto-update**: Chrome handles this automatically — users get new versions within hours of your upload

## Quick Decision: Version Number

For store launch, consider bumping from `0.3.0` to `1.0.0`. It signals "this is ready" to users. The `0.x` versions were internal development milestones. Up to you — some devs prefer launching at `0.x` to set expectations that it's early.

## Estimated Timeline

| Step | Time |
|------|------|
| Developer account setup | 15 minutes |
| Take screenshots | 20 minutes |
| Write privacy policy | 15 minutes |
| Package ZIP | 5 minutes |
| Fill store listing | 30 minutes |
| Google review | 1-7 days |
| **Total hands-on work** | **~1.5 hours** |
