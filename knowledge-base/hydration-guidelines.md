# Hydration guidelines

## Key facts

- **Base drink volume formula:** `V_drinks (ml) = (weight_kg × 35) × (1 − k_diet)`. `k_diet` accounts for water already obtained from food.
  - `k_diet = 0.20` (balanced diet: normal fresh veg/fruit/soups/dairy) — the EFSA/WHO standard for the general population.
  - `k_diet = 0.10` (processed-food diet, low fresh produce) — conservative estimate, used when diet quality can't be verified, to avoid underestimating and risking dehydration.
- **EFSA total intake baseline** (food + drink, adults, mild climate, normal activity): men 14+ → 2.5 l/day, women 14+ → 2.0 l/day. Net drink volume at `k = 0.10`: 2.25 l (men) / 1.80 l (women).
- **Seniors:** thirst sensation and kidney concentrating ability decline with age — set a fixed minimum drink target (1.5–2.0 l/day) rather than relying on felt thirst.
- **Activity correction:** light exercise/walking → +300 to 500 ml/hour; intense training or cardio → +700 to 1000 ml/hour. Beyond ~90 min of endurance effort, plain water isn't enough — electrolytes (Na⁺, K⁺) are needed to avoid hyponatremia.
- **Climate correction:** hot weather (>30 °C) → +500 to 1500 ml/day depending on humidity. Cold weather lowers felt thirst by up to 40%, but respiratory/indoor-heating water loss stays high, so the standard target should **not** be reduced.
- **Hydration status indicators:** urine light straw/translucent yellow = optimal; dark yellow/amber = dehydrated; persistently fully clear = overhydrated. Typical urination frequency: 4–7×/day. The body absorbs water at roughly 400–500 ml/hour, so intake should be spread through the day rather than taken all at once.

## How ProgressByMe applies this

`src/lib/water-goal.ts` (used by `src/components/ui/water-tracker.tsx`) computes each client's daily water goal instead of a flat 3 l target:
- Base volume from the client's most recent logged body weight, using the conservative coefficient (`k = 0.10`) since the app can't verify every client's diet quality.
- A training bonus added when a workout is scheduled for today, scaled by category as an exertion proxy (`cardio` → intense, `gym`/`home` → moderate, `rehab` → light), using the midpoint of each correction range above.
- A climate bonus from live weather (`src/lib/weather.ts`, Open-Meteo, no API key) at the client's device location: 0 below 30°C, scaling linearly from 500 ml at 30°C to 1500 ml at 40°C, bumped 15% further when humidity is ≥60%. Best-effort — silently skipped if location permission is denied or the lookup fails.
- Falls back to a flat 3 l default when no weight has been logged yet.

Not yet modeled: age/senior minimum, pregnancy/breastfeeding, and the >90 min electrolyte note — a trainer should still adjust individually where these apply.

## Sources
- "Standardy a doporučení pro hydrataci organismu" (internal reference doc, EFSA-based) — added 2026-09-30
