# NC-02: UI — Display Dual-Axis Results (Presentation BS + Claim Hazard)

**Milestone:** New Calibration
**Type:** Feature
**Priority:** High
**Depends on:** NC-01 (dual-axis prompt)
**Blocks:** None

---

## Problem

The popup currently shows a single BS score with component breakdown. After NC-01, the model returns two independent signals:

1. **Presentation BS Score** (0-100) — how the article presents information
2. **Claim Hazard** (0-3 levels) — how risky the transmitted claims are

The UI needs to surface both signals clearly, without confusing users or making the popup feel cluttered. Users should immediately understand: "The writing is X, and the claims are Y."

---

## Design Approach

The gauge and main score stay focused on **Presentation BS** (the thing we can measure reliably). Claim Hazard gets its own distinct visual element — not a second gauge, but a clear badge/indicator that sits alongside the presentation results.

### Layout Flow (top to bottom)

```
[Provider · Model dropdown]
[Analyze Button]

── Score Section ──────────────────────────
  [SVG Gauge — Presentation BS]
  [Score Number]  [Reporting Badge]
  [Score Band]
  [Justification]
  [Confidence]

── Claim Hazard Section (NEW) ─────────────
  [Hazard Level Badge]  [Category Pill]
  [Hazard Reason — 1-2 sentences]

── Component Scores ───────────────────────
  [Evidence Weakness     ████░░  6/10]
  [Context Loss          ██░░░░  3/10]
  [...etc]

── Red Flags ──────────────────────────────
  • flag 1
  • flag 2

── Summary & Claims (article pill) ────────
  [Summary text]
  [Main claims list]

── Footer ─────────────────────────────────
  [Suggested action]
  [Model signature]
  [Disclaimer]
```

---

## Detailed UI Changes

### 1. Reporting Quality Badge (next to score number)

Position a small colored pill next to or just below the score number:

```html
<div class="reporting-badge" id="reporting-badge">careful</div>
```

Badge colors (follows the green-to-brown palette):
| Badge | Color | Background |
|-------|-------|------------|
| careful | #15803d | #f0fdf4 |
| decent | #65a30d | #f7fee7 |
| mixed | #b45309 | #fffbeb |
| sloppy | #92400e | #fef3c7 |
| unreliable | #78350f | #fef2f2 |

CSS: `font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px;`

Computed client-side from the BS score using `getReportingBadge()` from NC-01.

### 2. Claim Hazard Section (new section, after confidence)

A distinct visual block between the score section and component scores:

```html
<div class="claim-hazard-section" id="claim-hazard-section" style="display:none;">
  <div class="claim-hazard-header">
    <span class="claim-hazard-icon" id="claim-hazard-icon"></span>
    <span class="claim-hazard-label" id="claim-hazard-label">Claim Hazard</span>
    <span class="claim-hazard-level" id="claim-hazard-level">none</span>
    <span class="claim-hazard-category" id="claim-hazard-category"></span>
  </div>
  <p class="claim-hazard-reason" id="claim-hazard-reason"></p>
</div>
```

**Hazard level visual treatment:**

| Level | Icon | Level Color | Background | Border |
|-------|------|-------------|------------|--------|
| none (0) | (section hidden) | — | — | — |
| low (1) | subtle dot | #65a30d | #f7fee7 | #d9f99d |
| moderate (2) | warning triangle | #b45309 | #fffbeb | #fde68a |
| high (3) | alert diamond | #78350f | #fef2f2 | #fecaca |

**Key UX rules:**
- When claim hazard is `none` (level 0), hide the entire section. No point showing "everything is fine" — that's noise.
- When hazard is `low`, show it but subtly — it's informational, not alarming.
- When hazard is `moderate` or `high`, the section should be visually prominent — distinct background, maybe a left border accent.
- The category pill (e.g., "disputed facts", "conspiracy adjacent") helps the user understand what kind of hazard.
- The reason text explains it in 1-2 sentences from the model.

**CSS for claim hazard section:**
```css
.claim-hazard-section {
  margin: 10px 0;
  padding: 10px 12px;
  border-radius: 10px;
  border-left: 3px solid transparent;
}

.claim-hazard-section.level-1 {
  background: #f7fee7;
  border-left-color: #65a30d;
}

.claim-hazard-section.level-2 {
  background: #fffbeb;
  border-left-color: #b45309;
}

.claim-hazard-section.level-3 {
  background: #fef2f2;
  border-left-color: #78350f;
}

.claim-hazard-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.claim-hazard-label {
  font-weight: 600;
  color: #555;
}

.claim-hazard-level {
  font-weight: 700;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
}

.claim-hazard-category {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  background: rgba(0,0,0,0.06);
  color: #666;
}

.claim-hazard-reason {
  margin-top: 4px;
  font-size: 11px;
  color: #555;
  line-height: 1.4;
}
```

### 3. Updated renderResults() in popup.js

Add after the confidence rendering block:

```javascript
// Claim Hazard
const hazardSection = document.getElementById('claim-hazard-section');
if (hazardSection && data.claimHazard) {
  const level = data.claimHazard.level || 0;
  
  if (level === 0) {
    hazardSection.style.display = 'none';
  } else {
    hazardSection.style.display = 'block';
    hazardSection.className = `claim-hazard-section level-${level}`;
    
    document.getElementById('claim-hazard-level').textContent = data.claimHazard.label || 'none';
    
    const categoryEl = document.getElementById('claim-hazard-category');
    const category = (data.claimHazard.category || 'routine').replace(/_/g, ' ');
    if (category !== 'routine') {
      categoryEl.textContent = category;
      categoryEl.style.display = 'inline';
    } else {
      categoryEl.style.display = 'none';
    }
    
    document.getElementById('claim-hazard-reason').textContent = data.claimHazard.reason || '';
  }
} else if (hazardSection) {
  hazardSection.style.display = 'none';
}

// Reporting Badge
const badgeEl = document.getElementById('reporting-badge');
if (badgeEl) {
  const badge = getReportingBadge(data.bsScore);
  badgeEl.textContent = badge;
  badgeEl.className = `reporting-badge badge-${badge}`;
}
```

### 4. Popup tooltip / explainer

Since this is a new concept, users might not immediately grok the difference between "Presentation BS" and "Claim Hazard." Add a subtle info tooltip or first-time explanation.

Option A (minimal): Tooltip on hover over the section headers
- Gauge area tooltip: "How trustworthy is the writing? Measures framing, sourcing, and editorial quality."
- Claim Hazard tooltip: "Are the claims themselves risky? Independent of how well the article is written."

Option B (richer): A small "What does this mean?" link that toggles a brief explainer overlay.

Recommend starting with Option A — tooltips via `title` attributes. Low effort, zero UI clutter.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/ui/popup.html` | Add claim-hazard-section HTML block, reporting-badge element |
| `src/ui/popup.css` | Add claim hazard styles, reporting badge styles |
| `src/ui/popup.js` | Add claim hazard rendering, reporting badge rendering, import `getReportingBadge` |
| `src/shared/constants.js` | (Done in NC-01) CLAIM_HAZARD, REPORTING_BADGES |
| `src/shared/score-calculator.js` | (Done in NC-01) `getReportingBadge()` |

---

## Example Result States

### State 1: Clean article, no hazard
```
Gauge: 15/100   Badge: CAREFUL
Claim Hazard: (hidden — level 0)
```

### State 2: Clean article, high hazard
```
Gauge: 18/100   Badge: CAREFUL
Claim Hazard: HIGH — disputed facts
"Article accurately reports claims about election fraud that are
 widely disputed by election officials and independent auditors."
```

### State 3: Sloppy article, no hazard
```
Gauge: 72/100   Badge: SLOPPY
Claim Hazard: (hidden — level 0)
```

### State 4: Sloppy article, high hazard
```
Gauge: 78/100   Badge: SLOPPY
Claim Hazard: HIGH — conspiracy adjacent
"Article presents unverified claims about government surveillance
 programs without attribution, mixed with editorial speculation."
```

---

## Testing Plan

### Unit tests:

1. **popup rendering** — mock data with claim hazard level 0 hides section
2. **popup rendering** — mock data with level 2 shows section with correct class
3. **popup rendering** — reporting badge maps correctly to score ranges
4. **popup rendering** — missing claimHazard in data doesn't crash

### Manual smoke test:

5. Load extension, run on Reuters article — verify hazard section hidden
6. Run on conspiracy-adjacent article — verify hazard section visible with correct styling
7. Verify tooltips appear on hover
8. Verify popup doesn't exceed 700px max height with all sections visible

---

## Acceptance Criteria

- [ ] Claim hazard section renders with correct level styling (1/2/3)
- [ ] Claim hazard section hidden when level is 0
- [ ] Category pill shows human-readable category
- [ ] Reporting badge shows next to score number
- [ ] Badge color follows green-to-brown palette
- [ ] Tooltips explain both axes on hover
- [ ] No layout breakage — popup fits within 420x700px
- [ ] Backward compatible — if model returns no claim_hazard, UI doesn't break
- [ ] All new rendering code has unit tests
