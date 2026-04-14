# UX-01: Popup Results Page Redesign

## Summary

Full redesign of the popup results page to improve readability, information hierarchy, and brand personality. Shifts from generic blue/red palette to a distinctive green-to-brown ("hankey") color scheme that matches the BS Detector brand.

## Changes (top to bottom)

### 1. Provider dropdown — show active model inline
- Current: dropdown shows only provider name (e.g. "Google Gemini")
- New: show provider + model (e.g. "Google Gemini · gemini-2.5-flash")
- Only visible when 2+ providers configured (existing behavior)

### 2. Analyze button — brown/hankey color
- Replace blue (`#2563eb`) with a warm brown that says "BS"
- Hover state: slightly darker shade
- Disabled state: muted brown

### 3. BS Score gauge
- Replace plain number with an arch/gauge visualization
- SVG arc from green (low BS) through orange to brown (high BS)
- Score number centered inside the gauge
- Needle or filled arc to indicate position
- Responsive sizing within popup width

### 4. Score band title
- Larger font size for the band label (e.g. "Some patterns worth noting")
- Remove color-matching with score — use black/dark text for contrast
- Ensure readability across all score ranges (green text on white was hard to read)

### 5. Score justification subtitle
- Remove italic styling
- Slightly larger font for quick-scan readability

### 6. Confidence level — move up
- Relocate from bottom meta section to directly below the justification text
- "Confidence" label in grey, actual level (high/medium/low) in black/bold
- Acts as context frame before detailed sections

### 7. Component Scores — move above Summary
- Reorder: Component Scores is now the first detailed section
- People process visual bars faster than text
- Color palette for bars: dark green → orange → brown (no yellow, no red)
- Green should be a darker shade for readability

### 8. Red Flags — "no scroll zone"
- Move Red Flags directly after Component Scores
- Should be visible without scrolling on standard popup height (600px)
- Cap at max-height with overflow scroll if more than ~3 flags

### 9. Summary + Main Claims — "the article pill"
- Summary text section after red flags
- Main Claims list after summary
- Together these form the digestible article overview

### 10. Footer — disclaimer + model signature
- Suggested action / "seek additional sources" disclaimer
- Model signature line (provider + model) stays at bottom

### 11. Funny analyzing text rotation
- While analysis is running, rotate through humorous status messages
- Similar to loading screen personality text
- Examples: "Sniffing for BS...", "Consulting the smell-o-meter...", "Checking the manure levels...", etc.
- Rotate every ~2 seconds
- Keep it fun but not cringe

## Color Palette

| Usage               | Current     | New                          |
|---------------------|-------------|------------------------------|
| Main action button  | Blue #2563eb | Brown (hankey shade) TBD     |
| Score: low (good)   | Green #16a34a | Darker green #15803d        |
| Score: mid-low      | Lime #84cc16 | Warm orange #d97706          |
| Score: mid          | Amber #d97706 | Deeper orange #c2410c       |
| Score: mid-high     | Orange #ea580c | Brown #92400e               |
| Score: high (bad)   | Red #dc2626 | Dark brown #78350f           |
| Component bars      | Same as score | Same green-to-brown gradient |

## Information Hierarchy (new order)

```
┌─────────────────────────────────┐
│ Header + Provider Selector      │
│ [Analyze Button - Brown]        │
│                                 │
│     ┌───────────────┐           │
│     │  GAUGE ARC    │           │
│     │    Score: 43  │           │
│     └───────────────┘           │
│  "Notable credibility concerns" │
│  Brief justification text       │
│  Confidence: medium             │
│                                 │
│  ── Component Scores ────────── │
│  Evidence Weakness    ████░ 6   │
│  Context Loss         ███░░ 5   │
│  ...                            │
│                                 │
│  ── Red Flags ──────────────── │
│  ⚠ Unconfirmed claims...       │
│  ⚠ Sensational headline...     │
│                                 │
│  ── Summary ────────────────── │
│  Article text summary...        │
│                                 │
│  ── Main Claims ────────────── │
│  • Claim one                    │
│  • Claim two                    │
│                                 │
│  ── Footer ─────────────────── │
│  Seek additional sources...     │
│  Openrouter · claude-sonnet-4   │
└─────────────────────────────────┘
```

## Technical Notes

- Gauge: SVG `<path>` with arc, gradient via `<linearGradient>` or multiple stops
- `getScoreColor()` in popup.js needs full rework for new palette
- Status text rotation: array of strings, `setInterval` during analysis state
- Component bar colors must use same `getScoreColor()` function
- Test: visual regression on all 5 score bands
