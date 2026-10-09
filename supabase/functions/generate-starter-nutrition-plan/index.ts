// Supabase Edge Function: rule-based (not AI) starter nutrition plan
// generator — the nutrition counterpart to generate-starter-plan. Runs
// right after onboarding so a client has calorie/macro targets and a
// rough starter meal plan instead of an empty nutrition screen. See
// knowledge-base/nutrition-targets.md for the full formula and reasoning.
//
// Deploy: npx supabase functions deploy generate-starter-nutrition-plan
// No extra secrets needed — same service-role pattern as the other
// generate-* functions, which is also why this can insert a plan with no
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

type Food = { id: string; name: string; kcal_100g: number; protein_100g: number; carbs_100g: number; fat_100g: number }

type Profile = {
  id: string
  date_of_birth: string | null
  sex: string | null
  height_cm: number | null
  fitness_goal: string | null
  activity_level: string | null
  dietary_restrictions: string | null
}

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}
const GOAL_KCAL_MULTIPLIER: Record<string, number> = { lose_weight: 0.8, gain_muscle: 1.1, maintain: 1, improve_endurance: 1 }
const FALLBACK_KCAL_BY_GOAL: Record<string, number> = { lose_weight: 1700, gain_muscle: 2400, maintain: 2000, improve_endurance: 2200 }
const FALLBACK_WEIGHT_KG = 75
const FAT_SHARE_OF_KCAL = 0.25

function ageFromDateOfBirth(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth)
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const hadBirthday = now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate())
  if (!hadBirthday) age--
  return age
}

function mifflinStJeor(weightKg: number, heightCm: number, age: number, sex: string | null): number {
  const male = 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  const female = 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  if (sex === 'male') return male
  if (sex === 'female') return female
  return (male + female) / 2
}

function calculateTargets(profile: Profile, latestWeightKg: number | null) {
  const goal = profile.fitness_goal ?? 'maintain'
  const weightKg = latestWeightKg ?? FALLBACK_WEIGHT_KG
  let kcal: number

  if (profile.date_of_birth && profile.height_cm && latestWeightKg) {
    const age = ageFromDateOfBirth(profile.date_of_birth)
    const bmr = mifflinStJeor(latestWeightKg, profile.height_cm, age, profile.sex)
    const tdee = bmr * (ACTIVITY_MULTIPLIER[profile.activity_level ?? ''] ?? ACTIVITY_MULTIPLIER.moderate)
    const floor = profile.sex === 'male' ? 1500 : 1200
    kcal = Math.max(Math.round(tdee * (GOAL_KCAL_MULTIPLIER[goal] ?? 1)), floor)
  } else {
    kcal = FALLBACK_KCAL_BY_GOAL[goal] ?? FALLBACK_KCAL_BY_GOAL.maintain
  }

  const proteinG = Math.round(weightKg * (goal === 'gain_muscle' ? 2.0 : 1.8))
  const fatG = Math.round((kcal * FAT_SHARE_OF_KCAL) / 9)
  const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4))

  return { kcal, proteinG, carbsG, fatG }
}

const MEAL_SHARES = [
  { name: 'Breakfast', share: 0.25 },
  { name: 'Lunch', share: 0.35 },
  { name: 'Dinner', share: 0.3 },
  { name: 'Snack', share: 0.1 },
]

function macroShare(food: Food, macroGramsPer100: number): number {
  if (food.kcal_100g <= 0) return 0
  return (macroGramsPer100 * 4) / food.kcal_100g
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics so "vejce"/"mléko" match regardless of accents
}

// profiles.dietary_restrictions is free text (e.g. "alergie na vejce") with
// no structured allergen data to match against — foods has no allergen
// column either. This is a blunt but effective v1: exclude any food whose
// name shows up as a substring of what the client wrote. Catches the
// reported case (an egg allergy noted in free text still got eggs
// suggested) without needing a whole allergen-tagging data model first.
function excludeRestrictedFoods(foods: Food[], dietaryRestrictions: string | null): Food[] {
  if (!dietaryRestrictions?.trim()) return foods
  const restrictions = normalize(dietaryRestrictions)
  return foods.filter(food => !restrictions.includes(normalize(food.name)))
}

function pickMealItems(foods: Food[], mealProteinG: number, cursor: { protein: number; carb: number; fat: number }) {
  const proteinFoods = foods.filter(f => macroShare(f, f.protein_100g) > 0.4)
  const carbFoods = foods.filter(f => macroShare(f, f.carbs_100g) > 0.4)
  const fatFoods = foods.filter(f => (f.fat_100g * 9) / Math.max(f.kcal_100g, 1) > 0.4)

  const items: { food: Food; grams: number }[] = []
  const usedIds = new Set<string>()

  if (proteinFoods.length > 0) {
    const food = proteinFoods[cursor.protein % proteinFoods.length]
    cursor.protein++
    usedIds.add(food.id)
    const grams = Math.min(300, Math.max(50, Math.round((mealProteinG / Math.max(food.protein_100g, 1)) * 100)))
    items.push({ food, grams })
  }

  // A fatty meat/fish often qualifies as both the protein and the fat
  // bucket — excluding already-used foods keeps a meal from listing the
  // same item twice instead of giving it actual variety.
  const remainingCarbFoods = carbFoods.filter(f => !usedIds.has(f.id))
  if (remainingCarbFoods.length > 0) {
    const food = remainingCarbFoods[cursor.carb % remainingCarbFoods.length]
    cursor.carb++
    usedIds.add(food.id)
    items.push({ food, grams: 80 })
  }

  const remainingFatFoods = fatFoods.filter(f => !usedIds.has(f.id))
  if (remainingFatFoods.length > 0) {
    const food = remainingFatFoods[cursor.fat % remainingFatFoods.length]
    cursor.fat++
    items.push({ food, grams: 15 })
  }

  return items
}

function scaleMacros(food: Food, grams: number) {
  const factor = grams / 100
  return {
    kcal: Math.round(food.kcal_100g * factor),
    protein: Math.round(food.protein_100g * factor * 10) / 10,
    carbs: Math.round(food.carbs_100g * factor * 10) / 10,
    fat: Math.round(food.fat_100g * factor * 10) / 10,
  }
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
    .select('id, date_of_birth, sex, height_cm, fitness_goal, activity_level, dietary_restrictions')
    .eq('id', client_id)
    .single()

  if (profileError || !profile) {
    return jsonResponse({ error: 'Profile not found', details: profileError }, 404)
  }

  const { data: latestWeight } = await supabase
    .from('weight_logs')
    .select('weight_kg')
    .eq('client_id', client_id)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: foods } = await supabase.from('foods').select('id, name, kcal_100g, protein_100g, carbs_100g, fat_100g')
  const foodList = excludeRestrictedFoods((foods ?? []) as Food[], (profile as Profile).dietary_restrictions)

  if (foodList.length === 0) {
    return jsonResponse({ created: false, reason: 'no_foods_in_library' })
  }

  const targets = calculateTargets(profile as Profile, latestWeight?.weight_kg ?? null)

  const { data: plan, error: planError } = await supabase
    .from('nutrition_plans')
    .insert({
      client_id,
      trainer_id: null,
      title: 'Starter nutrition plan',
      target_kcal: targets.kcal,
      target_protein: targets.proteinG,
      target_carbs: targets.carbsG,
      target_fat: targets.fatG,
    })
    .select('id')
    .single()

  if (planError || !plan) {
    return jsonResponse({ error: 'Failed to create nutrition plan', details: planError }, 500)
  }

  const cursor = { protein: 0, carb: 0, fat: 0 }

  for (let i = 0; i < MEAL_SHARES.length; i++) {
    const { name, share } = MEAL_SHARES[i]
    const { data: meal, error: mealError } = await supabase
      .from('meals')
      .insert({ nutrition_plan_id: plan.id, name, order_index: i })
      .select('id')
      .single()

    if (mealError || !meal) continue

    const mealProteinG = Math.round(targets.proteinG * share)
    const items = pickMealItems(foodList, mealProteinG, cursor)

    const rows = items.map(({ food, grams }) => {
      const macros = scaleMacros(food, grams)
      return {
        meal_id: meal.id,
        food_id: food.id,
        name: food.name,
        amount: `${grams} g`,
        ...macros,
      }
    })

    if (rows.length > 0) await supabase.from('meal_items').insert(rows)
  }

  return jsonResponse({ created: true, targets })
})
