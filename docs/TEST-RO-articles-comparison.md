# Cross-Model Scoring Test: Romanian Articles (2026-04-13)

## Test Setup

Same story (Peter Magyar criticizing Orban re: George Simion), two outlets with different editorial styles.

**Ground truth** (user assessment):
- **Antena3 CNN**: "wow zone" but factually OK, CNN-affiliated
- **Romania TV**: "full sensational" outlet

**Expected result**: Romania TV should score HIGHER (more BS) than Antena3.

## Results Matrix

| Model                    | Provider    | Tags              | Antena3 | Romania TV | Delta | Correct? |
|--------------------------|-------------|-------------------|---------|------------|-------|----------|
| Claude Sonnet 4          | OpenRouter  | PERFORMANT/EXPENSIVE | 43      | 61         | +18   | YES      |
| Llama 3.3 70B (paid)     | OpenRouter  | RECOMMENDED       | 55      | 60         | +5    | YES      |
| Mistral Small 3.1 (free) | OpenRouter  | FREE              | 54      | 50         | -4    | NO       |
| Grok 3                   | Grok        | PERFORMANT/EXPENSIVE | 55      | 53         | -2    | NO       |
| Grok 3 Mini              | Grok        | RECOMMENDED       | 44      | 40         | -4    | NO       |

## Component Breakdown — Antena3

| Component            | Claude S4 | Llama 70B | Mistral S | Grok 3 | Grok Mini |
|----------------------|-----------|-----------|-----------|--------|-----------|
| Evidence Weakness    | 6         | 6         | 7         | 6      | 4         |
| Context Loss         | 5         | 4         | 6         | 7      | 6         |
| Certainty Inflation  | 3         | 7         | 5         | 4      | 3         |
| Emotional Pressure   | 4         | 8         | 4         | 5      | 7         |
| Source Transparency   | 2         | 2         | 3         | 5      | 2         |

## Component Breakdown — Romania TV

| Component            | Claude S4 | Llama 70B | Mistral S | Grok 3 | Grok Mini |
|----------------------|-----------|-----------|-----------|--------|-----------|
| Evidence Weakness    | 7         | 6         | 4         | 6      | 4         |
| Context Loss         | 6         | 7         | 7         | 6      | 5         |
| Certainty Inflation  | 5         | 5         | 3         | 4      | 3         |
| Emotional Pressure   | 8         | 8         | 5         | 7      | 6         |
| Source Transparency   | 4         | 4         | 7         | 3      | 2         |

## Key Findings

1. **Only Claude Sonnet 4 and Llama 3.3 70B (paid) correctly rank the outlets.** Claude shows the clearest differentiation (+18 points).
2. **Free/budget models got it backwards.** Mistral Small, Grok 3, and Grok 3 Mini all scored Antena3 HIGHER than Romania TV.
3. **Emotional Pressure is the differentiator.** Claude and Llama correctly bump Romania TV's EP to 8. Free models miss this.
4. **All models handle Romanian language.** No gibberish or misinterpretation of content.
5. **Gemini not tested** — availability issues persisted.
