# NC-01: Dual-Axis Prompt — Presentation BS + Claim Hazard

**Milestone:** New Calibration
**Type:** Feature / Breaking Change
**Priority:** High
**Depends on:** None
**Blocks:** NC-02 (UI changes)

---

## Problem

The current prompt scores only **presentation quality** — how an article frames, sources, and communicates information. This is the right default, but it doesn't match what many users intuitively expect from a "BS Detector." Users want to know: "Is this article BS?" — which is really two questions:

1. Is the **presentation** trustworthy? (framing, sourcing, editorial tone)
2. Are the **claims being transmitted** hazardous? (disputed, conspiratorial, unverifiable, reality-detached)

A journalistically solid article quoting unhinged claims currently gets a low BS score. That's correct for presentation, but the user walks away thinking the content is "fine" when the claims themselves are radioactive. We need both signals without merging them into mud.

## Solution: Two-Layer Analysis

### Layer 1 — Presentation BS Score (existing, refined)

Keep the current 5-dimension weighted score exactly as it is:
- Evidence Weakness (30%)
- Context Loss (20%)
- Certainty Inflation (20%)
- Emotional Pressure (15%)
- Source Transparency (15%)

**No changes** to dimension definitions, weights, or scoring rules. The presentation score stays neutral and presentation-focused.

### Layer 2 — Claim Hazard Signal (new)

A separate, non-punitive indicator that flags the **nature of the claims** the article transmits, regardless of how well it's written.

**Claim Hazard Levels:**
| Level | Label | Meaning |
|-------|-------|---------|
| 0 | `none` | Claims are routine, well-established, or non-controversial |
| 1 | `low` | Some claims are debatable or unresolved, but within normal discourse |
| 2 | `moderate` | Article carries disputed, polarizing, or hard-to-verify claims |
| 3 | `high` | Article transmits extraordinary, conspiratorial, or reality-sensitive claims |

**Claim Hazard Categories** (the model picks the most relevant):
- `disputed_facts` — claims that contradict established consensus or are actively contested
- `conspiracy_adjacent` — claims that invoke hidden actors, cover-ups, or unfalsifiable narratives
- `unverifiable` — claims that cannot be checked by the reader (anonymous insider sources, secret meetings, "I was told")
- `polarizing_framing` — claims framed to divide rather than inform, even if technically accurate
- `speculative` — forward-looking claims presented with inappropriate confidence
- `routine` — nothing unusual about the claims (default for level 0)

**Key rules for the model:**
- Claim Hazard is about the CLAIMS, not the article's treatment of them
- A well-sourced article about conspiracy theories still has HIGH claim hazard
- Claim Hazard does NOT affect the Presentation BS Score — they are independent axes
- The model should explain WHY claims are hazardous in 1-2 sentences
- If the article is about sports results, weather, or a product review, claim hazard is `none`

### Layer 3 — Reporting Quality Badge (new, simple)

A one-word badge derived from the presentation score bands:
| Presentation BS Score | Badge |
|----------------------|-------|
| 0–20 | `careful` |
| 21–40 | `decent` |
| 41–60 | `mixed` |
| 61–80 | `sloppy` |
| 81–100 | `unreliable` |

This is computed client-side from the BS score (no model involvement). It just gives a human-friendly word to go with the number.

---

## Prompt Changes Required

### File: `src/prompts/templates/quick.js`

#### QUICK_SYSTEM_PROMPT changes:

1. **Add Claim Hazard section** after the existing scoring dimensions:

```
SECOND AXIS — Claim Hazard Assessment:
After scoring presentation quality, separately assess the nature of the claims the article transmits.
- This is NOT about how the article presents them — it's about what the claims themselves are.
- A well-written article about conspiracy theories has LOW presentation BS but HIGH claim hazard.
- A sloppy article about the weather has HIGH presentation BS but NONE claim hazard.
- Claim Hazard does NOT influence the BS Score. They are independent axes.

Rate claim hazard:
  0 = none: routine claims, well-established facts, non-controversial
  1 = low: some debatable or unresolved claims, within normal discourse
  2 = moderate: disputed, polarizing, or hard-to-verify claims present
  3 = high: extraordinary, conspiratorial, or reality-detached claims

Pick the most fitting category: disputed_facts, conspiracy_adjacent, unverifiable, polarizing_framing, speculative, routine
```

2. **Update the JSON schema** in the prompt to include:

```json
{
  "claim_hazard": {
    "level": "<0-3 integer>",
    "label": "none | low | moderate | high",
    "category": "disputed_facts | conspiracy_adjacent | unverifiable | polarizing_framing | speculative | routine",
    "reason": "1-2 sentences explaining why claims are or aren't hazardous"
  }
}
```

The full JSON schema becomes the existing fields plus `claim_hazard` as a new top-level key.

#### QUICK_USER_TEMPLATE changes:

Add one line to the instruction:
```
Remember: Score the PRESENTATION quality, not the topic. Then separately assess claim hazard. Return your analysis as valid JSON matching the schema in your instructions.
```

---

## Backend Changes Required

### File: `src/shared/response-parser.js`

Add parsing for the new `claim_hazard` field:

```javascript
// After existing field extraction, add:
const claimHazardRaw = parsed.claim_hazard || {};
const claimHazardLevel = clamp(Math.round(Number(claimHazardRaw.level ?? 0)), 0, 3);
const HAZARD_LABELS = ['none', 'low', 'moderate', 'high'];
const HAZARD_CATEGORIES = ['disputed_facts', 'conspiracy_adjacent', 'unverifiable', 'polarizing_framing', 'speculative', 'routine'];

data.claimHazard = {
  level: claimHazardLevel,
  label: HAZARD_LABELS[claimHazardLevel] || 'none',
  category: HAZARD_CATEGORIES.includes(claimHazardRaw.category) ? claimHazardRaw.category : 'routine',
  reason: claimHazardRaw.reason || ''
};
```

### File: `src/shared/constants.js`

Add claim hazard constants:

```javascript
export const CLAIM_HAZARD = {
  LEVELS: {
    NONE: 0,
    LOW: 1,
    MODERATE: 2,
    HIGH: 3
  },
  LABELS: ['none', 'low', 'moderate', 'high'],
  CATEGORIES: [
    'disputed_facts',
    'conspiracy_adjacent',
    'unverifiable',
    'polarizing_framing',
    'speculative',
    'routine'
  ]
};

export const REPORTING_BADGES = [
  { max: 20, label: 'careful' },
  { max: 40, label: 'decent' },
  { max: 60, label: 'mixed' },
  { max: 80, label: 'sloppy' },
  { max: 100, label: 'unreliable' }
];
```

### File: `src/shared/score-calculator.js`

Add reporting badge function:

```javascript
export function getReportingBadge(bsScore) {
  for (const badge of REPORTING_BADGES) {
    if (bsScore <= badge.max) return badge.label;
  }
  return 'unreliable';
}
```

---

## Testing Plan

### Unit tests to add:

1. **response-parser.test.js** — parse valid claim_hazard, missing claim_hazard defaults to none, clamp level to 0-3, reject unknown categories
2. **score-calculator.test.js** — reporting badge mapping for each range boundary
3. **prompt-engine.test.js** — verify prompt includes "claim_hazard" schema and dual-axis instructions

### Integration test:

4. **Cross-axis independence test** — mock response with high presentation BS + low claim hazard, and low presentation BS + high claim hazard. Verify both parse independently and neither contaminates the other.

### Manual smoke test:

5. Run analysis on:
   - Straight news article (low BS, no hazard) — e.g., Reuters market report
   - Well-written conspiracy article (low BS, high hazard)
   - Sloppy celebrity gossip (high BS, no hazard)
   - Antena3 sensationalist piece (mixed BS, moderate hazard)

---

## Token Impact

The claim_hazard section adds ~4 object fields to the JSON response (~50-80 extra output tokens) and ~150 extra tokens to the system prompt. Total increase: ~200-230 tokens per request. At current rates this is negligible for paid models and within free-tier limits.

---

## Acceptance Criteria

- [ ] Prompt includes dual-axis instructions with clear separation
- [ ] JSON schema includes `claim_hazard` with level, label, category, reason
- [ ] Response parser handles claim_hazard (with graceful defaults)
- [ ] Constants file has CLAIM_HAZARD and REPORTING_BADGES
- [ ] Score calculator has `getReportingBadge()` function
- [ ] All new code has unit tests
- [ ] Cross-axis independence verified
- [ ] Existing 172 tests still pass
- [ ] Manual smoke test on 4 article types documented
