export type UserRole = 'client' | 'trainer'
export type Sex = 'male' | 'female' | 'other'
export type FitnessGoal = 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_endurance'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

export type Profile = {
  id: string
  full_name: string | null
  role: UserRole
  trainer_id: string | null
  avatar_url: string | null
  date_of_birth: string | null
  sex: Sex | null
  height_cm: number | null
  fitness_goal: FitnessGoal | null
  activity_level: ActivityLevel | null
  health_conditions: string | null
  dietary_restrictions: string | null
  phone: string | null
  created_at: string
}

export type ClientIntake = {
  id: string
  trainer_id: string
  full_name: string
  email: string
  phone: string | null
  age: number | null
  weight_kg: number | null
  height_cm: number | null
  sex: Sex | null
  fitness_goal: FitnessGoal | null
  notes: string | null
  claimed_by: string | null
  claimed_at: string | null
  created_at: string
}

export type WorkoutCategory = 'home' | 'gym' | 'cardio' | 'rehab'

export type Workout = {
  id: string
  client_id: string
  trainer_id: string
  title: string
  scheduled_date: string | null
  category: WorkoutCategory | null
  created_at: string
}

export type WorkoutTranslation = {
  id: string
  workout_id: string
  language_code: string
  title: string
}

export type Exercise = {
  id: string
  slug: string
  muscle_groups: string[]
  movement_type: string | null
  difficulty: string | null
  equipment: string | null
  min_age: number | null
  max_age: number | null
  contraindications: string[]
  created_at: string
}

export type ExerciseMuscleWeight = {
  id: string
  exercise_id: string
  // One of MUSCLE_GROUPS in @/lib/exercise-taxonomy.
  muscle: string
  // Relative share (0–1] of this exercise's load this muscle absorbs.
  weight: number
}

export type ExerciseTranslation = {
  id: string
  exercise_id: string
  language_code: string
  name: string
  description: string | null
  video_url: string | null
}

export type WorkoutExercise = {
  id: string
  workout_id: string
  // References the exercise library for a reusable exercise (name/video
  // resolved from exercise_translations for the viewer's language). Null for
  // a one-off custom exercise, where `name`/`video_url` below apply instead.
  exercise_id: string | null
  order_index: number
  name: string | null
  sets: number
  reps: string
  rest_seconds: number | null
  tempo: string | null
  video_url: string | null
  notes: string | null
}

export type WorkoutLog = {
  id: string
  workout_id: string
  client_id: string
  completed_at: string
  notes: string | null
}

export type Food = {
  id: string
  name: string
  kcal_100g: number
  protein_100g: number
  carbs_100g: number
  fat_100g: number
}

export type NutritionPlan = {
  id: string
  client_id: string
  trainer_id: string
  title: string
  target_kcal: number
  target_protein: number
  target_carbs: number
  target_fat: number
  created_at: string
}

export type Meal = {
  id: string
  nutrition_plan_id: string
  name: string
  order_index: number
}

export type MealItem = {
  id: string
  meal_id: string
  food_id: string | null
  name: string
  amount: string | null
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export type WeightLog = {
  id: string
  client_id: string
  date: string
  weight_kg: number
}

export type StepLog = {
  id: string
  client_id: string
  date: string
  steps: number
}

export type BloodPressureLog = {
  id: string
  client_id: string
  date: string
  systolic: number
  diastolic: number
  pulse: number | null
}

export type WaterIntake = {
  id: string
  client_id: string
  date: string
  liters: number
  goal_liters: number
}

export type ReadinessLog = {
  id: string
  client_id: string
  date: string
  sleep_hours: number | null
  energy_level: number | null
  soreness_level: number | null
}

export type CheckIn = {
  id: string
  client_id: string
  submitted_at: string
  weight: number | null
  sleep_hours: number | null
  water_liters: number | null
  soreness_rating: number | null
  training_rating: number | null
  recovery_rating: number | null
  diet_adherence_rating: number | null
  notes: Record<string, string> | null
  measurements: Record<string, string> | null
}

export type CheckInPhoto = {
  id: string
  check_in_id: string
  storage_path: string
}
