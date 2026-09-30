// Trend categories for the weight/steps/blood-pressure history screens.
// Screens map these to translated copy via `history.<tracker>.comments.<category>`.

import type { FitnessGoal } from '@/types/database'

export type WeightTrendCategory = 'no_data' | 'down_wanted' | 'down_unwanted' | 'up_wanted' | 'up_unwanted' | 'stable'

const WEIGHT_CHANGE_THRESHOLD_KG = 0.5

export function weightTrendCategory(
  entries: { date: string; weight_kg: number }[],
  goal: FitnessGoal | null
): { category: WeightTrendCategory; deltaKg: number } {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length < 2) return { category: 'no_data', deltaKg: 0 }

  const deltaKg = Math.round((sorted[sorted.length - 1].weight_kg - sorted[0].weight_kg) * 10) / 10

  if (Math.abs(deltaKg) < WEIGHT_CHANGE_THRESHOLD_KG) return { category: 'stable', deltaKg }

  const isDown = deltaKg < 0
  const wantsDown = goal === 'lose_weight'
  const wantsUp = goal === 'gain_muscle'

  if (isDown) return { category: wantsDown ? 'down_wanted' : wantsUp ? 'down_unwanted' : 'stable', deltaKg }
  return { category: wantsUp ? 'up_wanted' : wantsDown ? 'up_unwanted' : 'stable', deltaKg }
}

export type StepsTrendCategory = 'no_data' | 'above_target' | 'below_target'

const STEPS_TARGET = 8000

export function stepsTrendCategory(entries: { date: string; steps: number }[]): { category: StepsTrendCategory; average: number } {
  if (!entries.length) return { category: 'no_data', average: 0 }

  const average = Math.round(entries.reduce((sum, e) => sum + e.steps, 0) / entries.length)
  return { category: average >= STEPS_TARGET ? 'above_target' : 'below_target', average }
}

export type BloodPressureCategory = 'no_data' | 'normal' | 'elevated' | 'high1' | 'high2'

export function bloodPressureCategory(systolic: number | null, diastolic: number | null): BloodPressureCategory {
  if (systolic == null || diastolic == null) return 'no_data'
  if (systolic >= 140 || diastolic >= 90) return 'high2'
  if (systolic >= 130 || diastolic >= 80) return 'high1'
  if (systolic >= 120) return 'elevated'
  return 'normal'
}

// Day-over-day "nice direction" checks used by the home-screen trackers to
// decide when to celebrate (confetti + a one-line comment) right after a
// save, compared to the most recently logged entry before it.

const NORMAL_SYSTOLIC_MIN = 90
const NORMAL_SYSTOLIC_MAX = 120

export function isStepsImprovement(previousSteps: number | null, newSteps: number): boolean {
  return previousSteps != null && newSteps > previousSteps
}

export function isWeightImprovement(previousWeightKg: number | null, newWeightKg: number, goal: FitnessGoal | null): boolean {
  if (previousWeightKg == null || newWeightKg === previousWeightKg) return false
  const wantsUp = goal === 'gain_muscle'
  return wantsUp ? newWeightKg > previousWeightKg : newWeightKg < previousWeightKg
}

// Only meaningful when the previous reading was outside the normal band —
// moving further from normal, or a normal-to-normal fluctuation, isn't a
// "win" worth celebrating.
export function isBloodPressureImprovement(previousSystolic: number | null, newSystolic: number): boolean {
  if (previousSystolic == null) return false
  if (previousSystolic > NORMAL_SYSTOLIC_MAX) return newSystolic < previousSystolic
  if (previousSystolic < NORMAL_SYSTOLIC_MIN) return newSystolic > previousSystolic
  return false
}
