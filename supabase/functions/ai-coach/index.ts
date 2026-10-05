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
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }), { status: 500 })
  }

  const body = (await req.json().catch(() => null)) as CoachRequest | null
  if (!body?.workoutTitle || !body.language) {
    return new Response(JSON.stringify({ error: 'workoutTitle and language are required' }), { status: 400 })
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
    return new Response(JSON.stringify({ error: 'Anthropic request failed', details }), { status: 502 })
  }

  const result = await anthropicResponse.json()
  const message = result.content?.[0]?.text?.trim()

  if (!message) {
    return new Response(JSON.stringify({ error: 'Empty response from model' }), { status: 502 })
  }

  return new Response(JSON.stringify({ message }), { headers: { 'Content-Type': 'application/json' } })
})
