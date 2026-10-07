// Supabase Edge Function: the AI coach's only job right now is to phrase a
// short, motivational note about *today's* workout — it never decides
// anything. The readiness score, category and volume adjustment are all
// computed deterministically by the engine (src/lib/readiness.ts) before
// this function is ever called; the model only explains/encourages, per
// the "LLM proposes, engine decides" principle in ADR 0001. If this call
// fails for any reason, the client falls back to a static message — see
// src/hooks/use-coach-message.ts.
//
// Deploy: npx supabase functions deploy ai-coach
// Secrets required (npx supabase secrets set ...):
//   ANTHROPIC_API_KEY — from https://console.anthropic.com/settings/keys

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const MODEL = 'claude-haiku-4-5' // cheap/fast — this is one or two sentences of copy, not planning

// The web build calls this directly from the browser (supabase.functions.invoke),
// so it needs real CORS headers — without them the browser's preflight OPTIONS
// request fails before the actual POST ever goes out, which silently looks like
// "the call failed" client-side (it falls back to static copy, see
// use-coach-message.ts) rather than a loud error.
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

type CoachRequest = {
  language: 'cs' | 'en' | 'sk'
  workoutTitle: string
  isAdjusted: boolean
  readinessCategory: 'low' | 'moderate' | 'high' | null
  goal: string | null
  experienceLevel: string | null
}

const LANGUAGE_NAME: Record<CoachRequest['language'], string> = {
  cs: 'Czech',
  en: 'English',
  sk: 'Slovak',
}

function buildPrompt(req: CoachRequest): string {
  const lines = [
    `Client's today workout: "${req.workoutTitle}".`,
    req.goal ? `Their stated goal: ${req.goal}.` : null,
    req.experienceLevel ? `Experience level: ${req.experienceLevel}.` : null,
    req.readinessCategory
      ? `Their computed readiness for today is "${req.readinessCategory}".`
      : 'No readiness data logged today.',
    req.isAdjusted
      ? "Because readiness is low, the app has already reduced today's set counts — the client will see the adjusted numbers on screen."
      : null,
  ].filter(Boolean)

  return lines.join(' ')
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

  const body = (await req.json().catch(() => null)) as CoachRequest | null
  if (!body?.workoutTitle || !body.language) {
    return jsonResponse({ error: 'workoutTitle and language are required' }, 400)
  }

  const systemPrompt = [
    `You are David, a warm and direct personal trainer writing a one-off note inside a fitness app.`,
    `Write in ${LANGUAGE_NAME[body.language]}. One or two short sentences, no more. No emoji, no exclamation-mark spam.`,
    `Motivational and personal, never clinical or robotic. Never invent numbers, sets, reps, or medical claims —`,
    `the app already shows the exact plan; you're just the encouraging word next to it.`,
    `If readiness is "low", acknowledge it kindly and reassure them the lighter session is still worth doing.`,
    `If readiness is "high" or "moderate", just be genuinely encouraging about today's session.`,
  ].join(' ')

  const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 150,
      system: systemPrompt,
      messages: [{ role: 'user', content: buildPrompt(body) }],
    }),
  })

  if (!anthropicResponse.ok) {
    const details = await anthropicResponse.text()
    return jsonResponse({ error: 'Anthropic request failed', details }, 502)
  }

  const result = await anthropicResponse.json()
  const message = result.content?.[0]?.text?.trim()

  if (!message) {
    return jsonResponse({ error: 'Empty response from model' }, 502)
  }

  return jsonResponse({ message })
})
