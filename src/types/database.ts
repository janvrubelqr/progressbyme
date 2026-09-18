export type UserRole = 'client' | 'trainer'

export type Profile = {
  id: string
  full_name: string | null
  role: UserRole
  trainer_id: string | null
  avatar_url: string | null
  created_at: string
}

export type Workout = {
  id: string
  client_id: string
  trainer_id: string
  title: string
  scheduled_date: string | null
  created_at: string
}

export type WorkoutExercise = {
  id: string
  workout_id: string
  order_index: number
  name: string
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
  name: string
  amount: string | null
  kcal: number
  protein: number
  carbs: number
  fat: number
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
