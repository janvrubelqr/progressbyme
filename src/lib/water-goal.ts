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

export function calculateWaterGoalLiters(weightKg: number | null, intensity: TrainingIntensity): number {
  if (!weightKg || weightKg <= 0) return FALLBACK_GOAL_LITERS

  const baseMl = weightKg * 35 * (1 - DIET_COEFFICIENT)
  const totalMl = baseMl + TRAINING_BONUS_ML[intensity]

  // Round to the nearest 50 ml for a clean displayed target.
  const roundedMl = Math.round(totalMl / 50) * 50
  return Math.round((roundedMl / 1000) * 100) / 100
}
