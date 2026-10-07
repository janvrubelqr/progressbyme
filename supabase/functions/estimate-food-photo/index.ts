// Supabase Edge Function: estimates what's in a food photo and its rough
// macros, via Claude's vision input. The photo is only ever held in memory
// for this one request — it's never written to Storage or the database
// (see supabase/migrations/019_food_logs.sql). The client shows this
// estimate for the person to confirm/adjust before it's logged; it's
// explicitly framed as an estimate throughout (never presented as exact),
// consistent with ADR 0001's caution around health-adjacent AI output.
//
// Deploy: npx supabase functions deploy estimate-food-photo
// Secrets required: ANTHROPIC_API_KEY (already set for ai-coach, reused here)

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

type EstimateRequest = {
  imageBase64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
  language: 'cs' | 'en' | 'sk'
}

const LANGUAGE_NAME: Record<EstimateRequest['language'], string> = {
  cs: 'Czech',
  en: 'English',
  sk: 'Slovak',
}

const SYSTEM_PROMPT = [
  'You estimate the contents and rough macros of a meal from a photo for a fitness app.',
  'This is a rough visual estimate, not a lab measurement — the client knows that. Be reasonable, not overly',
  'cautious or overly precise. Respond with ONLY a JSON object, no markdown fences, no other text, matching',
  'exactly this shape: {"description": string, "kcal": number, "proteinG": number, "carbsG": number, "fatG": number}.',
  'description is a short plain-language identification of what you see (in the requested language), e.g.',
  '"Grilled chicken breast with rice and broccoli". The numbers are your best single estimate (not a range) for',
  'the portion shown. If the image genuinely does not show food, set kcal/proteinG/carbsG/fatG to 0 and say so',
  'in description.',
].join(' ')

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
  if (!body?.imageBase64 || !body.mediaType || !body.language) {
    return jsonResponse({ error: 'imageBase64, mediaType and language are required' }, 400)
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
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: body.mediaType, data: body.imageBase64 } },
            { type: 'text', text: 'What is this meal, and what are its approximate macros?' },
          ],
        },
      ],
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
    parsed = JSON.parse(raw)
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
