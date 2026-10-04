import type { ExerciseMuscleWeight } from '@/types/database'

export type MuscleLoadMap = Record<string, number>

// How much weights for one exercise are allowed to drift from summing to 1.0
// before the Studio UI should warn the trainer — they're meant to represent
// "where did 100% of this exercise's effort go", so a legitimately finished
// set should land close to 1, not an incomplete draft.
const WEIGHT_SUM_TOLERANCE = 0.05

export function sumExerciseWeights(weights: ExerciseMuscleWeight[]): number {
  return weights.reduce((sum, w) => sum + w.weight, 0)
}

export function isWeightSumValid(weights: ExerciseMuscleWeight[]): boolean {
  if (weights.length === 0) return true
  return Math.abs(sumExerciseWeights(weights) - 1) <= WEIGHT_SUM_TOLERANCE
}

// One exercise's contribution to each muscle's load for a single
// performance of it. `sets` is today's only available volume signal
// (workout_logs doesn't record per-set weight/reps yet) — a coarse v1,
// see docs/adr/0001-b2c-pivot-architecture.md.
export function exerciseMuscleLoad(weights: ExerciseMuscleWeight[], sets: number): MuscleLoadMap {
  const load: MuscleLoadMap = {}
  for (const w of weights) {
    load[w.muscle] = (load[w.muscle] ?? 0) + w.weight * sets
  }
  return load
}

export function mergeMuscleLoad(maps: MuscleLoadMap[]): MuscleLoadMap {
  const merged: MuscleLoadMap = {}
  for (const map of maps) {
    for (const [muscle, value] of Object.entries(map)) {
      merged[muscle] = (merged[muscle] ?? 0) + value
    }
  }
  return merged
}

// Ranks muscles by load, highest first — e.g. for "don't schedule heavy
// quad work today, yesterday already hit them hard" style engine rules.
export function topLoadedMuscles(load: MuscleLoadMap, limit = 3): { muscle: string; value: number }[] {
  return Object.entries(load)
    .map(([muscle, value]) => ({ muscle, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}
