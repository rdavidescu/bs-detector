# CAL-01: Prompt calibration — "HOW not WHAT" scoring philosophy

## Problem

When testing the same Al Jazeera article across 3 providers, we observed a **22-point BS score spread** (OpenRouter 62, Grok 59, Gemini 40). Root cause analysis revealed the models were penalizing the *content being reported* rather than *how the article presents it*.

**Specific failure:** Trump's "BLOWN TO HELL" quote was scored as Certainty Inflation (7-8/10) by OpenRouter and Grok. But the article *accurately quoted* a public figure — that's journalism, not inflation. The article's own editorial voice was relatively measured.

## Solution implemented

Rewrote `src/prompts/templates/quick.js` with a "HOW not WHAT" philosophy:

### Key changes to system prompt

1. **Added CRITICAL PRINCIPLE section** — explicit instruction to score presentation quality, not topic choice or quoted speech
2. **Certainty Inflation** — added IMPORTANT callout: "Only score the article's own voice. If the article quotes someone making absolute claims, that is REPORTING, not certainty inflation"
3. **Emotional Pressure** — reframed to measure the GAP between events and presentation: "Dramatic events deserve proportional language"
4. **Source Transparency** — scoped explicitly: "Do NOT evaluate whether the cited sources themselves are reliable — that is outside scope." Focus on attribution technique (named vs vague, specific vs strategic anonymity)
5. **Evidence Weakness** — clarified: "Evaluate whether the article SHOWS its work, not whether the underlying evidence is itself correct"
6. **Context Loss** — clarified: "Evaluate whether the article frames events fairly, not whether you agree with its perspective"
7. **User template** — reinforced with "Score the PRESENTATION quality, not the topic"

### What stayed the same

- All 5 dimension names unchanged
- All weights unchanged (30/20/20/15/15)
- JSON schema unchanged
- Scoring scale unchanged (0-10 per dimension, 0-100 composite)

## Before/After baseline (Al Jazeera Hormuz blockade article)

| Dimension | Manual | OpenRouter BEFORE | Grok BEFORE | Gemini BEFORE |
|---|---|---|---|---|
| Evidence Weakness | 5 | 7 | 6 | 4 |
| Context Loss | 6 | 5 | 5 | 4 |
| Certainty Inflation | 4 | 8 | 7 | 3 |
| Emotional Pressure | 6 | 6 | 6 | 5 |
| Source Transparency | 5 | 4 | 5 | 4 |
| BS Score | 52 | 62 | 59 | 40 |

Cross-provider spread: 22 points.

### Expected after calibration

- Certainty Inflation should drop across OpenRouter/Grok (stop penalizing quoted speech)
- Cross-provider spread should narrow (same philosophy = more consistent interpretation)
- Scores on well-sourced breaking news should land closer to 30-45 range

## Verification

Re-run the same article with all 3 providers after reload and compare.

## Labels

calibration, prompt-engineering, scoring
