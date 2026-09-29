// Controlled vocabularies for exercise metadata. Plain string constants
// (not DB enums) so the library can grow without a migration per new tag —
// same pattern as profiles.fitness_goal/activity_level.

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'upper_back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'core',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
  'legs',
  'hip',
  'lower_back',
  'full_body',
  'balance',
  'cardio',
  'mobility',
] as const
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export const MOVEMENT_TYPES = ['strength', 'cardio', 'mobility', 'stretch', 'isometric', 'plyometric', 'balance'] as const
export type MovementType = (typeof MOVEMENT_TYPES)[number]

export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number]

export const EQUIPMENT_TYPES = [
  'bodyweight',
  'dumbbell',
  'barbell',
  'kettlebell',
  'resistance_band',
  'machine',
  'medicine_ball',
  'other',
] as const
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number]

// Cross-referenced against profiles.health_conditions when suggesting
// exercises later — kept intentionally small/coarse for now.
export const CONTRAINDICATION_TAGS = [
  'knee',
  'ankle',
  'lower_back',
  'lower_chest',
  'shoulder',
  'elbow',
  'hip',
  'wrist',
  'neck',
  'pregnancy',
  'high_blood_pressure',
  'heart_condition',
  'osteoporosis',
] as const
export type ContraindicationTag = (typeof CONTRAINDICATION_TAGS)[number]

// Session-level category (not per-exercise) — lets a client's workout list
// group/tab by "what kind of session is this" (home workout vs gym vs
// cardio vs rehab), matching how the reference app organizes workouts.
export const WORKOUT_CATEGORIES = ['home', 'gym', 'cardio', 'rehab'] as const
export type WorkoutCategoryTag = (typeof WORKOUT_CATEGORIES)[number]
