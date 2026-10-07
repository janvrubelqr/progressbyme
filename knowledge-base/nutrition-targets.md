# Daily nutrition targets (calories + macros)

How `src/lib/nutrition-targets.ts` and the `generate-starter-nutrition-plan`
Edge Function compute a client's daily kcal/protein/carbs/fat targets and
starter meal plan. Deterministic, no AI — matches ADR 0001's "engine
decides" principle, same as the training-plan generator.

## Calorie target

**Full calculation**, used when the profile has `date_of_birth`, `sex`,
`height_cm`, and at least one `weight_logs` entry:

1. **BMR** (Mifflin-St Jeor, the most widely validated formula for this):
   - Men: `10 × weight_kg + 6.25 × height_cm − 5 × age + 5`
   - Women: `10 × weight_kg + 6.25 × height_cm − 5 × age − 161`
   - `sex: 'other'` uses the average of both formulas.
2. **TDEE** = BMR × activity multiplier:
   `sedentary 1.2, light 1.375, moderate 1.55, active 1.725, very_active 1.9`
   (standard Harris-Benedict activity bands, reused here for Mifflin-St Jeor too — common practice).
3. **Goal adjustment**: `lose_weight` → TDEE × 0.8 (a ~20% deficit — moderate,
   sustainable, not the aggressive end of what's possible), `gain_muscle` →
   TDEE × 1.1 (a ~10% surplus — enough to support growth without excess fat
   gain), `maintain`/`improve_endurance` → TDEE unchanged.
4. Floor at 1200 kcal (women) / 1500 kcal (men) regardless of the formula's
   output — a safety floor, not a recommendation to actually eat that little.

**Fallback**, used when any of those profile fields are missing (true for
every client right after the 5-step onboarding, which doesn't collect
demographics — those live in "My Account"): a flat default by goal
(`lose_weight` 1700, `gain_muscle` 2400, `maintain` 2000,
`improve_endurance` 2200 kcal). Clearly worse than the real calculation,
but better than nothing — the nutrition screen should prompt the client to
fill in height/DOB/sex/weight for an accurate number once this fallback is
in use.

## Macro split

Grams, not percentages, and protein is set first since it's the macro
where more usually beats less for anyone training:

- **Protein**: `2.0 g/kg bodyweight` for `gain_muscle`, `1.8 g/kg` for
  everything else (still a solid training intake, just not bulking-level).
  Uses the fallback weight of 75kg when no weight_logs entry exists.
- **Fat**: `25%` of total daily kcal ÷ 9.
- **Carbs**: whatever's left — `(kcal − protein×4 − fat×9) / 4`.

## Starter meal plan

The generator splits the daily targets across 4 meals (breakfast 25%,
lunch 35%, dinner 30%, snack 10% of kcal/macros) and, for each meal, greedily
picks one food from each macro-dominant bucket in the `foods` library
(protein-dominant: `protein_100g × 4 / kcal_100g > 0.4`; carb-dominant same
test on carbs; fat-dominant same test on fat) and scales the gram amount of
the protein source to hit that meal's protein budget, then adds a fixed
~80g portion of a carb source and ~15g of a fat source. This is a rough
v1 — it fills the plate with real, reasonable food, not a precisely
macro-matched plan. David/a trainer can edit any of it afterward via the
existing nutrition builder.
