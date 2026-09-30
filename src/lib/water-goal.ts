// Dynamic daily water goal — see knowledge-base/hydration-guidelines.md for the
// source formula and reasoning behind the constants below.

import type { WorkoutCategoryTag } from '@/lib/exercise-taxonomy'

export type TrainingIntensity = 'none' | 'light' | 'moderate' | 'intense'

const DIET_COEFFICIENT = 0.1 // conservative estimate — diet quality isn't verified per client
const FALLBACK_GOAL_LITERS = 3

// Midpoint of each correction range from the hydration guidelines (ml/session).
const TRAINING_BONUS_ML: Record<TrainingIntensity, number> = {
  none: 0,
  light: 400, // rehab sessions — light activity range
  moderate: 400, // home/gym resistance sessions — light-to-moderate range
  intense: 850, // cardio sessions — intense training range
}

export function categoryToIntensity(category: WorkoutCategoryTag | null): TrainingIntensity {
  if (category === 'cardio') return 'intense'
  if (category === 'gym' || category === 'home') return 'moderate'
  if (category === 'rehab') return 'light'
  return 'none'
}

const HOT_THRESHOLD_C = 30
const HOT_CEILING_C = 40 // temp at which the bonus maxes out
const HUMID_THRESHOLD_PCT = 60
const HUMID_MULTIPLIER = 1.15

// Climate correction: "+500 to 1500 ml/day above 30°C, scaled by humidity"
// — scaled linearly between the two temperatures, then bumped for humid heat.
export function climateBonusMl(temperatureC: number | null, humidityPct: number | null): number {
  if (temperatureC == null || temperatureC <= HOT_THRESHOLD_C) return 0

  const clampedTemp = Math.min(temperatureC, HOT_CEILING_C)
  const fraction = (clampedTemp - HOT_THRESHOLD_C) / (HOT_CEILING_C - HOT_THRESHOLD_C)
  let bonus = 500 + fraction * 1000

  if (humidityPct != null && humidityPct >= HUMID_THRESHOLD_PCT) bonus *= HUMID_MULTIPLIER

  return Math.round(bonus)
}

export function calculateWaterGoalLiters(
  weightKg: number | null,
  intensity: TrainingIntensity,
  weather?: { temperatureC: number; humidityPct: number } | null
): number {
  if (!weightKg || weightKg <= 0) return FALLBACK_GOAL_LITERS

  const baseMl = weightKg * 35 * (1 - DIET_COEFFICIENT)
  const trainingMl = TRAINING_BONUS_ML[intensity]
  const climateMl = climateBonusMl(weather?.temperatureC ?? null, weather?.humidityPct ?? null)
  const totalMl = baseMl + trainingMl + climateMl

  // Round to the nearest 50 ml for a clean displayed target.
  const roundedMl = Math.round(totalMl / 50) * 50
  return Math.round((roundedMl / 1000) * 100) / 100
}
