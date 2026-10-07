// Supabase Edge Function: rule-based (not AI) starter plan generator.
// Runs once right after a client finishes onboarding (see
// src/app/onboarding.tsx) so they land on Home with an actual week of
// workouts instead of "you don't have a workout scheduled yet". This is
// the "engine decides" half of ADR 0001 — deterministic filtering over the
// exercise library, no LLM involved. David/a trainer can refine or replace
// any of this later via the Studio; this just means nobody starts empty.
//
// Deploy: npx supabase functions deploy generate-starter-plan
// No extra secrets needed — uses the service role already available to
// every Edge Function, which is also why this can insert workouts with no
// trainer_id (bypasses the trainer-only write RLS entirely).
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

type Exercise = {
  id: string
  difficulty: string | null
  equipment: string | null
  contraindications: string[]
}

type Profile = {
  id: string
  fitness_goal: string | null
  experience_level: string | null
  equipment_access: string[]
  injury_tags: string[]
  training_days_per_week: number | null
}

const EXERCISES_PER_SESSION = 5
const DAYS_AHEAD = 7
const DEFAULT_DAYS_PER_WEEK = 3

const EXPERIENCE_ALLOWS: Record<string, string[]> = {
  beginner: ['beginner'],
  intermediate: ['beginner', 'intermediate'],
  advanced: ['beginner', 'intermediate', 'advanced'],
}

// Sets/reps/rest defaults by stated goal — same rough convention a trainer
// would default to, not individualized, since there's no training history yet.
const GOAL_PRESCRIPTION: Record<string, { sets: number; reps: string; restSeconds: number }> = {
  lose_weight: { sets: 3, reps: '12-15', restSeconds: 45 },
  gain_muscle: { sets: 4, reps: '8-10', restSeconds: 90 },
  maintain: { sets: 3, reps: '10-12', restSeconds: 60 },
  improve_endurance: { sets: 3, reps: '15-20', restSeconds: 30 },
}
const DEFAULT_PRESCRIPTION = GOAL_PRESCRIPTION.maintain

function pickEligibleExercises(exercises: Exercise[], profile: Profile): Exercise[] {
  const allowedDifficulty = EXPERIENCE_ALLOWS[profile.experience_level ?? ''] ?? ['beginner', 'intermediate', 'advanced']
  const equipmentAccess = new Set([...profile.equipment_access, 'bodyweight'])

  return exercises.filter(exercise => {
    if (exercise.difficulty && !allowedDifficulty.includes(exercise.difficulty)) return false
    if (exercise.equipment && !equipmentAccess.has(exercise.equipment)) return false
    if (exercise.contraindications.some(tag => profile.injury_tags.includes(tag))) return false
    return true
  })
}

function sessionDates(daysPerWeek: number): string[] {
  const days = Math.min(Math.max(daysPerWeek, 1), 7)
  const step = DAYS_AHEAD / days
  const offsets = Array.from(new Set(Array.from({ length: days }, (_, i) => Math.round(1 + i * step))))

  const today = new Date()
  return offsets.map(offset => {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() + offset)
    return d.toISOString().slice(0, 10)
  })
}

function categoryFor(profile: Profile): string {
  const hasGymEquipment = profile.equipment_access.some(e => ['barbell', 'machine'].includes(e))
  return hasGymEquipment ? 'gym' : 'home'
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const { client_id } = await req.json().catch(() => ({}))
  if (!client_id) {
    return jsonResponse({ error: 'client_id is required' }, 400)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, fitness_goal, experience_level, equipment_access, injury_tags, training_days_per_week')
    .eq('id', client_id)
    .single()

  if (profileError || !profile) {
    return jsonResponse({ error: 'Profile not found', details: profileError }, 404)
  }

  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, difficulty, equipment, contraindications')

  const eligible = pickEligibleExercises((exercises ?? []) as Exercise[], profile as Profile)
  if (eligible.length === 0) {
    // Nothing in the library matches — library is probably still thin.
    // Not an error: the client just starts with an empty plan, same as today.
    return jsonResponse({ createdWorkouts: 0, reason: 'no_eligible_exercises' })
  }

  const prescription = GOAL_PRESCRIPTION[profile.fitness_goal ?? ''] ?? DEFAULT_PRESCRIPTION
  const category = categoryFor(profile as Profile)
  const dates = sessionDates(profile.training_days_per_week ?? DEFAULT_DAYS_PER_WEEK)

  let createdWorkouts = 0
  let cursor = 0

  for (let i = 0; i < dates.length; i++) {
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        client_id,
        trainer_id: null,
        title: `${category === 'gym' ? 'Gym' : 'Home'} workout ${i + 1}`,
        scheduled_date: dates[i],
        category,
      })
      .select('id')
      .single()

    if (workoutError || !workout) continue

    const sessionExercises: Exercise[] = []
    for (let n = 0; n < EXERCISES_PER_SESSION; n++) {
      sessionExercises.push(eligible[cursor % eligible.length])
      cursor++
    }

    const rows = sessionExercises.map((exercise, index) => ({
      workout_id: workout.id,
      exercise_id: exercise.id,
      order_index: index,
      sets: prescription.sets,
      reps: prescription.reps,
      rest_seconds: prescription.restSeconds,
    }))

    await supabase.from('workout_exercises').insert(rows)
    createdWorkouts++
  }

  return jsonResponse({ createdWorkouts })
})
