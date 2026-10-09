// Supabase Edge Function: lets a client ask in free text to change today's
// workout ("add more ab exercises", "this is too much for my legs today").
// Unlike ai-coach (pure phrasing), this one has to turn free text into an
// actual change — but per ADR 0001 the model still never invents an
// exercise or writes to the DB itself. It only classifies the request into
// a small structured action + a short reply; the engine below decides
// whether that action is reasonable (e.g. refuses to pile on a muscle
// group that's already well covered in this session) and, if so, picks the
// concrete exercise(s) deterministically from the library using the same
// eligibility rules as generate-starter-plan (equipment/injury/difficulty).
//
// Deploy: npx supabase functions deploy workout-chat
// Secrets required: ANTHROPIC_API_KEY (already set for ai-coach)
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const MODEL = 'claude-haiku-4-5'

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

// A single session rarely benefits from more than this many exercises
// targeting the same muscle group — given to the model as a guideline, not
// a hard rule it has to recite, so it can still use judgment.
const SOFT_MUSCLE_GROUP_CAP = 3
const MAX_ADD_COUNT = 3
const MAX_REMOVE_COUNT = 3

type ChatRequest = {
  workout_id: string
  client_id: string
  message: string
  language: 'cs' | 'en' | 'sk'
}

const LANGUAGE_NAME: Record<ChatRequest['language'], string> = {
  cs: 'Czech',
  en: 'English',
  sk: 'Slovak',
}

type ExerciseRow = {
  id: string
  muscle_groups: string[]
  difficulty: string | null
  equipment: string | null
  contraindications: string[]
}

type Profile = {
  fitness_goal: string | null
  experience_level: string | null
  equipment_access: string[]
  injury_tags: string[]
}

const GOAL_PRESCRIPTION: Record<string, { sets: number; reps: string; restSeconds: number }> = {
  lose_weight: { sets: 3, reps: '12-15', restSeconds: 45 },
  gain_muscle: { sets: 4, reps: '8-10', restSeconds: 90 },
  maintain: { sets: 3, reps: '10-12', restSeconds: 60 },
  improve_endurance: { sets: 3, reps: '15-20', restSeconds: 30 },
}
const DEFAULT_PRESCRIPTION = GOAL_PRESCRIPTION.maintain

function stripCodeFence(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
}

function pickEligibleExercises(exercises: ExerciseRow[], profile: Profile, excludeIds: Set<string>): ExerciseRow[] {
  const allowedDifficulty: Record<string, string[]> = {
    beginner: ['beginner'],
    intermediate: ['beginner', 'intermediate'],
    advanced: ['beginner', 'intermediate', 'advanced'],
  }
  const allowed = allowedDifficulty[profile.experience_level ?? ''] ?? ['beginner', 'intermediate', 'advanced']
  const equipmentAccess = new Set([...profile.equipment_access, 'bodyweight'])

  return exercises.filter(exercise => {
    if (excludeIds.has(exercise.id)) return false
    if (exercise.difficulty && !allowed.includes(exercise.difficulty)) return false
    if (exercise.equipment && !equipmentAccess.has(exercise.equipment)) return false
    if (exercise.contraindications.some(tag => profile.injury_tags.includes(tag))) return false
    return true
  })
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }
  if (!ANTHROPIC_API_KEY) {
    return jsonResponse({ error: 'ANTHROPIC_API_KEY is not configured' }, 500)
  }

  const body = (await req.json().catch(() => null)) as ChatRequest | null
  if (!body?.workout_id || !body.client_id || !body.message?.trim() || !body.language) {
    return jsonResponse({ error: 'workout_id, client_id, message and language are required' }, 400)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .select('id, client_id')
    .eq('id', body.workout_id)
    .single()

  if (workoutError || !workout || workout.client_id !== body.client_id) {
    return jsonResponse({ error: 'Workout not found' }, 404)
  }

  const [{ data: profile }, { data: currentRows }, { data: allExercises }] = await Promise.all([
    supabase
      .from('profiles')
      .select('fitness_goal, experience_level, equipment_access, injury_tags')
      .eq('id', body.client_id)
      .single(),
    supabase
      .from('workout_exercises')
      .select('id, exercise_id, order_index, name')
      .eq('workout_id', body.workout_id)
      .order('order_index', { ascending: true }),
    supabase.from('exercises').select('id, muscle_groups, difficulty, equipment, contraindications'),
  ])

  if (!profile) {
    return jsonResponse({ error: 'Profile not found' }, 404)
  }

  const currentExerciseIds = (currentRows ?? []).map(r => r.exercise_id).filter((id): id is string => !!id)
  const exercisesById = new Map((allExercises ?? []).map((e: ExerciseRow) => [e.id, e]))

  const { data: translations } = currentExerciseIds.length
    ? await supabase
        .from('exercise_translations')
        .select('exercise_id, language_code, name')
        .in('exercise_id', currentExerciseIds)
    : { data: [] }

  const nameFor = (row: { exercise_id: string | null; name: string | null }): string => {
    if (!row.exercise_id) return row.name ?? ''
    const match =
      (translations ?? []).find(t => t.exercise_id === row.exercise_id && t.language_code === body.language) ??
      (translations ?? []).find(t => t.exercise_id === row.exercise_id)
    return match?.name ?? row.name ?? ''
  }

  const muscleGroupCounts: Record<string, number> = {}
  for (const row of currentRows ?? []) {
    const exercise = row.exercise_id ? exercisesById.get(row.exercise_id) : null
    for (const muscle of exercise?.muscle_groups ?? []) {
      muscleGroupCounts[muscle] = (muscleGroupCounts[muscle] ?? 0) + 1
    }
  }

  const currentList = (currentRows ?? [])
    .map(row => `- ${nameFor(row)}`)
    .join('\n')
  const muscleGroupSummary = Object.entries(muscleGroupCounts)
    .map(([muscle, count]) => `${muscle}: ${count}`)
    .join(', ')

  const systemPrompt = [
    `You are David, a direct, experienced personal trainer. A client is looking at today's workout inside the app`,
    `and just typed you a request in the chat. You don't write to the database yourself — you decide WHAT should`,
    `happen and a human-readable reply; a deterministic system applies the actual change afterwards.`,
    ``,
    `Current exercises in this session:\n${currentList || '(none yet)'}`,
    `Muscle groups already covered in this session (exercise count per group): ${muscleGroupSummary || 'none'}`,
    ``,
    `As a rough guideline, a single session rarely benefits from more than ${SOFT_MUSCLE_GROUP_CAP} exercises`,
    `targeting the same muscle group — use judgment, not a hard rule. If the client asks to add more work for a`,
    `muscle group that's already well covered, you may politely decline or suggest something smaller instead.`,
    `If they ask to remove/reduce something, identify which exercise(s) from the CURRENT list above they mean.`,
    `If the request is unclear, off-topic, or not something you can act on, decline and say why briefly.`,
    ``,
    `Respond with ONLY a JSON object, no markdown fences, no other text, matching exactly this shape:`,
    `{"action": "add" | "remove" | "decline", "muscle_group": string | null, "count": number,`,
    ` "target_exercise_names": string[], "reply": string}`,
    `- muscle_group: one of chest, back, upper_back, shoulders, biceps, triceps, forearms, core, glutes, quads,`,
    `  hamstrings, calves, legs, hip, lower_back, full_body, balance, cardio, mobility. Required when action is "add".`,
    `- count: how many exercises to add or remove (1-${MAX_ADD_COUNT} for add, 1-${MAX_REMOVE_COUNT} for remove). 0 for decline.`,
    `- target_exercise_names: for "remove", the exact name(s) from the current list above to remove. Empty array otherwise.`,
    `- reply: 1-3 short sentences in ${LANGUAGE_NAME[body.language]}, written to the client directly, explaining what`,
    `  you did (or why you didn't). Warm but direct, no emoji.`,
  ].join('\n')

  const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: body.message.trim() }],
    }),
  })

  if (!anthropicResponse.ok) {
    const details = await anthropicResponse.text()
    return jsonResponse({ error: 'Anthropic request failed', details }, 502)
  }

  const result = await anthropicResponse.json()
  const raw = result.content?.[0]?.text?.trim()
  if (!raw) {
    return jsonResponse({ error: 'Empty response from model' }, 502)
  }

  let decision: {
    action?: string
    muscle_group?: string | null
    count?: number
    target_exercise_names?: string[]
    reply?: string
  }
  try {
    decision = JSON.parse(stripCodeFence(raw))
  } catch {
    return jsonResponse({ error: 'Could not parse model response', details: raw }, 502)
  }

  if (!decision.reply) {
    return jsonResponse({ error: 'Model response missing reply', details: decision }, 502)
  }

  let changed = false

  if (decision.action === 'add' && decision.muscle_group) {
    const count = Math.min(Math.max(decision.count ?? 1, 1), MAX_ADD_COUNT)
    const excludeIds = new Set(currentExerciseIds)
    const candidates = pickEligibleExercises(
      [...exercisesById.values()].filter(e => e.muscle_groups.includes(decision.muscle_group!)),
      profile as Profile,
      excludeIds
    )

    if (candidates.length > 0) {
      const prescription = GOAL_PRESCRIPTION[profile.fitness_goal ?? ''] ?? DEFAULT_PRESCRIPTION
      const startIndex = (currentRows?.length ?? 0)
      const toAdd = candidates.slice(0, count)

      const rows = toAdd.map((exercise, i) => ({
        workout_id: body.workout_id,
        exercise_id: exercise.id,
        order_index: startIndex + i,
        sets: prescription.sets,
        reps: prescription.reps,
        rest_seconds: prescription.restSeconds,
      }))

      const { error: insertError } = await supabase.from('workout_exercises').insert(rows)
      if (!insertError) changed = true
    }
  }

  if (decision.action === 'remove' && decision.target_exercise_names?.length) {
    const normalizedTargets = decision.target_exercise_names.map(n => n.toLowerCase().trim())
    const toRemove = (currentRows ?? [])
      .filter(row => normalizedTargets.includes(nameFor(row).toLowerCase().trim()))
      .slice(0, MAX_REMOVE_COUNT)

    if (toRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('workout_exercises')
        .delete()
        .in('id', toRemove.map(r => r.id))
      if (!deleteError) changed = true
    }
  }

  return jsonResponse({ reply: decision.reply, changed })
})
