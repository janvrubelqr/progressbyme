// Daily kcal/macro targets — see knowledge-base/nutrition-targets.md for
// the formulas and reasoning behind the constants below.

export type NutritionProfileInputs = {
  dateOfBirth: string | null // ISO date
  sex: 'male' | 'female' | 'other' | null
  heightCm: number | null
  fitnessGoal: string | null
  activityLevel: string | null
  latestWeightKg: number | null
}

export type NutritionTargets = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  isEstimated: boolean // true when the fallback (not the real BMR calc) was used
}

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

const GOAL_KCAL_MULTIPLIER: Record<string, number> = {
  lose_weight: 0.8,
  gain_muscle: 1.1,
  maintain: 1,
  improve_endurance: 1,
}

const FALLBACK_KCAL_BY_GOAL: Record<string, number> = {
  lose_weight: 1700,
  gain_muscle: 2400,
  maintain: 2000,
  improve_endurance: 2200,
}

const FALLBACK_WEIGHT_KG = 75
const FAT_SHARE_OF_KCAL = 0.25

function ageFromDateOfBirth(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth)
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const hasHadBirthdayThisYear =
    now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate())
  if (!hasHadBirthdayThisYear) age--
  return age
}

function mifflinStJeor(weightKg: number, heightCm: number, age: number, sex: NutritionProfileInputs['sex']): number {
  const male = 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  const female = 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  if (sex === 'male') return male
  if (sex === 'female') return female
  return (male + female) / 2
}

export function calculateNutritionTargets(inputs: NutritionProfileInputs): NutritionTargets {
  const goal = inputs.fitnessGoal ?? 'maintain'
  const weightKg = inputs.latestWeightKg ?? FALLBACK_WEIGHT_KG

  let kcal: number
  let isEstimated: boolean

  if (inputs.dateOfBirth && inputs.heightCm && inputs.latestWeightKg) {
    const age = ageFromDateOfBirth(inputs.dateOfBirth)
    const bmr = mifflinStJeor(inputs.latestWeightKg, inputs.heightCm, age, inputs.sex)
    const tdee = bmr * (ACTIVITY_MULTIPLIER[inputs.activityLevel ?? ''] ?? ACTIVITY_MULTIPLIER.moderate)
    const adjusted = tdee * (GOAL_KCAL_MULTIPLIER[goal] ?? 1)
    const floor = inputs.sex === 'male' ? 1500 : 1200
    kcal = Math.max(Math.round(adjusted), floor)
    isEstimated = false
  } else {
    kcal = FALLBACK_KCAL_BY_GOAL[goal] ?? FALLBACK_KCAL_BY_GOAL.maintain
    isEstimated = true
  }

  const proteinPerKg = goal === 'gain_muscle' ? 2.0 : 1.8
  const proteinG = Math.round(weightKg * proteinPerKg)
  const fatG = Math.round((kcal * FAT_SHARE_OF_KCAL) / 9)
  const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4))

  return { kcal, proteinG, carbsG, fatG, isEstimated }
}
