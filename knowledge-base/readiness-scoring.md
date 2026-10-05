# Daily readiness score

A single 0–100 number the training engine uses to decide whether to run
today's plan as scheduled, trim it, or go easier — see the "jeden den v
systému" example in `docs/architecture-handoff.md` and ADR 0001.

Deliberately simple and fully deterministic for v1 (no AI/LLM involved in
the number itself — the AI coach only *explains* it). Three daily inputs,
collected in ~10 seconds, same spirit as the weight/steps/water trackers:

- **Sleep** (hours last night)
- **Energy** (1–5, how rested/fresh you feel)
- **Soreness** (1–5, 5 = no soreness, 1 = very sore)

## Scoring

Each input maps to a 0–100 sub-score:

- `sleep_score = clamp(sleep_hours / 8, 0, 1) * 100` — 8 hours is the
  target ceiling; below that it's a straight linear penalty (4h → 50,
  0h → 0). No bonus for sleeping *more* than 8h in v1.
- `energy_score = (energy_level - 1) / 4 * 100` — 1→0, 5→100.
- `soreness_score = (soreness_level - 1) / 4 * 100` — same mapping; a 5
  (no soreness) contributes full marks.

Overall score is a weighted average: **sleep 40%, energy 35%, soreness
25%**. Sleep carries the most weight because it's the single factor with
the strongest evidence behind it in recovery research; energy is a decent
whole-body proxy; soreness is deliberately the smallest weight since it's
muscle-group-specific and a client might just be sore from yesterday's
workout rather than generally under-recovered.

**Missing inputs don't zero out the score.** If a client only logs sleep
today, the score is just the sleep sub-score — weights renormalize across
whichever inputs are present. If nothing is logged yet, there's no score
(the engine falls back to "proceed as planned").

## Using the score

- **< 50 — low.** Engine should meaningfully trim volume (today's app-layer
  guidance: ~25–30%) and/or swap heavy compound work for something lighter.
- **50–75 — moderate.** Proceed with the plan as-is.
- **> 75 — high.** Plan as-is; optionally a small encouraging nudge, no
  need to add extra volume just because the number is high.

These three bands and the trim percentage are a starting point, not a
tuned constant — expect to revisit once there's real usage data.

## Known limitations (v1)

- No wearable input yet (HRV, resting heart rate) — once Apple
  Health/Health Connect land (ADR 0001, phase F1), those should fold into
  this score rather than living as a separate number.
- Doesn't yet account for yesterday's actual training load (see
  `src/lib/muscle-load.ts`) — combining "how tired you say you feel" with
  "how much load the engine knows you did" is the natural next step once
  both exist.
