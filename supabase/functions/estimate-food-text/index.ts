// Supabase Edge Function: text-description counterpart to
// estimate-food-photo — estimates rough kcal/macros from a typed or
// voice-transcribed description ("two eggs and toast with butter") instead
// of a photo. Same model, same "always an estimate, client reviews before
// saving" framing (ADR 0001).
//
// Deploy: npx supabase functions deploy estimate-food-text
// Secrets required: ANTHROPIC_API_KEY (already set for ai-coach/
// estimate-food-photo, reused here)

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

type EstimateRequest = { description: string; language: 'cs' | 'en' | 'sk' }

const LANGUAGE_NAME: Record<EstimateRequest['language'], string> = {
  cs: 'Czech',
  en: 'English',
  sk: 'Slovak',
}

const SYSTEM_PROMPT = [
  'You estimate the rough macros of a meal from a short text description (typed or voice-transcribed) for a',
  'fitness app. This is a rough estimate, not a lab measurement — the client knows that. Be reasonable, not',
  'overly cautious or overly precise. If the description is vague about portion size, assume a typical adult',
  'serving. Respond with ONLY a JSON object, no markdown fences, no other text, matching exactly this shape:',
  '{"description": string, "kcal": number, "proteinG": number, "carbsG": number, "fatG": number}.',
  'description is a short, cleaned-up version of what the client said (in the requested language) — fix up',
  'phrasing but keep it recognizably their meal, e.g. "two eggs and toast with butter". If the text genuinely',
  "does not describe food, set the numbers to 0 and say so in description.",
].join(' ')

function stripCodeFence(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
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

  const body = (await req.json().catch(() => null)) as EstimateRequest | null
  if (!body?.description?.trim() || !body.language) {
    return jsonResponse({ error: 'description and language are required' }, 400)
  }

  const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      system: `${SYSTEM_PROMPT} Write the description in ${LANGUAGE_NAME[body.language]}.`,
      messages: [{ role: 'user', content: body.description.trim() }],
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

  let parsed: { description?: string; kcal?: number; proteinG?: number; carbsG?: number; fatG?: number }
  try {
    parsed = JSON.parse(stripCodeFence(raw))
  } catch {
    return jsonResponse({ error: 'Could not parse model response', details: raw }, 502)
  }

  if (!parsed.description || typeof parsed.kcal !== 'number') {
    return jsonResponse({ error: 'Model response missing required fields', details: parsed }, 502)
  }

  return jsonResponse({
    description: parsed.description,
    kcal: Math.max(0, Math.round(parsed.kcal)),
    proteinG: Math.max(0, Math.round(parsed.proteinG ?? 0)),
    carbsG: Math.max(0, Math.round(parsed.carbsG ?? 0)),
    fatG: Math.max(0, Math.round(parsed.fatG ?? 0)),
  })
})
