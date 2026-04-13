# Walking Skeleton Smoke Test — WS-09

**Date:** 2026-04-13
**Tester:** tsk (rdavidescu)
**Extension version:** Walking Skeleton (Epic 0, post WS-08 merge)
**Model:** `meta-llama/llama-3.3-70b-instruct` via OpenRouter (paid tier)
**Browser:** Chrome (developer mode, unpacked extension)

## Test Environment

- Windows 11
- Chrome latest stable
- OpenRouter account with $10 credits (paid tier, 1000 req/day)
- API key stored in `chrome.storage.local`

## Test Results

### Test 1: Romanian Opinion Article (hotnews.ro)

- **URL:** `hotnews.ro/un-vot-pentru-coruptia-fidesz-ce-trebuie-sa-aiba-in-vedere-maghiarii-din-transilvania-in-alegerile-din-ungaria-in-ciuda-liderilor-udmr`
- **Article type:** Opinion piece by Gabriel Andreescu about Fidesz corruption and Hungarian minority voting in Transylvania
- **BS Score:** 51 — Notable Credibility Concerns
- **Summary:** The article presents a critical perspective on the Fidesz party and its influence on the Hungarian minority in Transylvania, but lacks concrete evidence and relies on opinion-based arguments.
- **Response time:** ~3-5 seconds
- **Status:** PASS

**Assessment:** Score of 51 is reasonable for an opinion piece — correctly identified as opinion-based with limited concrete evidence. Not flagged as outright BS, but noted credibility concerns. Appropriate.

### Test 2: Romanian News Alert (digi24.ro)

- **URL:** `digi24.ro/stiri/externe/ue/peter-magyar-atac-dur-la-viktor-orban-dupa-victoria-electorala-tara-noastra-a-fost-condusa-de-un-criminal-organizat`
- **Article type:** News alert — Peter Magyar attacks Viktor Orban after electoral victory
- **BS Score:** 70 — Significant BS Patterns
- **Summary:** Peter Magyar launched a strong attack on former PM Viktor Orban, accusing him of running a propaganda machine and intimidating the population. The credibility is uncertain due to lack of explicit evidence and sourcing, with emotional tone and loaded language suggesting a biased perspective.
- **Response time:** ~3-5 seconds
- **Status:** PASS

**Assessment:** Score of 70 is reasonable — the article reports on political rhetoric with strong emotional language, loaded accusations, and limited sourcing. Higher score than the opinion piece makes sense given the more inflammatory content.

## Acceptance Criteria Verification

| Criteria | Status |
|----------|--------|
| Extension loads in Chrome developer mode without errors | PASS |
| Navigation to test URLs succeeds | PASS |
| Clicking Analyze triggers the full processing chain | PASS |
| Real API calls to OpenRouter complete successfully | PASS |
| BS Score and summary display in the popup | PASS |
| Scores fall within expected ranges for content quality | PASS |
| Results documented with screenshots | PASS (screenshots in PR/issue) |

## Observations and Learnings

1. **Free models are unreliable.** All free model providers (Venice, Google AI Studio) were rate-limited upstream during testing. Switching to paid model (`meta-llama/llama-3.3-70b-instruct` without `:free` suffix) resolved this immediately. Cost per analysis: ~$0.001-0.005.

2. **Romanian language content works.** The model correctly analyzed Romanian-language articles, produced English-language summaries and assessments. No localization issues.

3. **Score differentiation works.** Opinion article scored 51, inflammatory news alert scored 70 — the model is differentiating content types and credibility levels.

4. **UI renders correctly.** Score color coding (orange for 51, darker orange for 70), band labels, summaries, and component scores all display properly in the popup.

5. **Response time is acceptable.** 3-5 seconds for a full analysis including content extraction, prompt building, API call, parsing, and rendering.

## Known Issues for Future Sprints

- Free model fallback strategy needed (upstream rate limits are common)
- Content script uses inlined code (no ES module imports) — needs bundler
- API key must be set via DevTools console or config.js seeding — no settings UI yet
- No caching of results — re-analyzing same page makes new API call
- Popup scroll needed on smaller screens to see all component scores

## Conclusion

The Walking Skeleton walks. The full chain from button click to AI-powered BS score is operational. Ready to move to vertical slice implementation.
