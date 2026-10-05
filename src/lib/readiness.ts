// Daily readiness score (0-100) — see knowledge-base/readiness-scoring.md
// for the formula and reasoning behind the weights/constants below.

export type ReadinessInputs = {
  sleepHours: number | null
  energyLevel: number | null // 1-5
  sorenessLevel: number | null // 1-5, 5 = no soreness
}

export type ReadinessCategory = 'low' | 'moderate' | 'high'

const SLEEP_TARGET_HOURS = 8
const WEIGHTS = { sleep: 0.4, energy: 0.35, soreness: 0.25 } as const

const LOW_THRESHOLD = 50
const HIGH_THRESHOLD = 75

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function fiveScaleToScore(level: number): number {
  return clamp01((level - 1) / 4) * 100
}

// Returns null when there's nothing logged yet — callers should treat that
// as "no signal, proceed as planned" rather than a low score.
export function calculateReadinessScore(inputs: ReadinessInputs): number | null {
  const parts: { score: number; weight: number }[] = []

  if (inputs.sleepHours != null) {
    parts.push({ score: clamp01(inputs.sleepHours / SLEEP_TARGET_HOURS) * 100, weight: WEIGHTS.sleep })
  }
  if (inputs.energyLevel != null) {
    parts.push({ score: fiveScaleToScore(inputs.energyLevel), weight: WEIGHTS.energy })
  }
  if (inputs.sorenessLevel != null) {
    parts.push({ score: fiveScaleToScore(inputs.sorenessLevel), weight: WEIGHTS.soreness })
  }

  if (parts.length === 0) return null

  const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0)
  const weightedSum = parts.reduce((sum, p) => sum + p.score * p.weight, 0)
  return Math.round(weightedSum / totalWeight)
}

export function readinessCategory(score: number): ReadinessCategory {
  if (score < LOW_THRESHOLD) return 'low'
  if (score < HIGH_THRESHOLD) return 'moderate'
  return 'high'
}

// Suggested volume multiplier for the training engine to apply to today's
// plan — e.g. 0.7 means "cut sets/reps to ~70% of planned". 1 = no change.
export function readinessVolumeMultiplier(category: ReadinessCategory): number {
  if (category === 'low') return 0.7
  return 1
}
