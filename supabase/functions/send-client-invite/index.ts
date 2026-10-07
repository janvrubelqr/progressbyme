// Supabase Edge Function: sends a branded email via Resend when a trainer
// adds a new client (client_intake row). Picks one of two messages —
// "sign up" if no account exists yet for that email, or "you've been
// added, just log in" if one already does.
//
// Deploy: npx supabase functions deploy send-client-invite
// Secrets required (npx supabase secrets set ...):
//   RESEND_API_KEY   — from https://resend.com/api-keys
//   RESEND_FROM_EMAIL — optional, defaults to Resend's sandbox sender
//                        (onboarding@resend.dev), which can only deliver to
//                        your own verified Resend account email until you
//                        verify a sending domain in Resend.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Called from the web build's browser (supabase.functions.invoke in
// (trainer)/clients/new.tsx), so it needs real CORS headers — without them
// the preflight OPTIONS request fails before the real POST goes out. That
// call site is fire-and-forget with a swallowed .catch(), so this was
// failing completely silently: no invite email ever sent, no error shown.
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

function renderEmail(opts: { trainerName: string; clientName: string; email: string; hasAccount: boolean }) {
  const heading = opts.hasAccount ? `${opts.trainerName} tě přidal/a do appky` : `${opts.trainerName} tě zve do appky`
  const body = opts.hasAccount
    ? `Byl/a jsi přidán/a jako klient v appce Progress&nbsp;by&nbsp;David. Účet už máš založený — stačí se přihlásit stejným emailem (<strong>${opts.email}</strong>) a uvidíš svůj tréninkový plán.`
    : `Byl/a jsi pozván/a ke sledování tréninku, jídelníčku a check-inů v appce Progress&nbsp;by&nbsp;David. Otevři appku a zaregistruj se přesně s tímto emailem (<strong>${opts.email}</strong>) — automaticky tě to spojí s tvým trenérem.`

  return `<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${opts.hasAccount ? 'Byl/a jsi přidán/a' : 'Pozvánka'}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500&display=swap');
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#0A0A0B;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0B;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%;">
            <tr>
              <td align="center" style="padding-bottom:32px;">
                <div style="font-family:'Oswald',Arial Narrow,Arial,sans-serif; font-weight:600; font-size:18px; letter-spacing:4px; color:#D2A85E;">
                  PROGRESS
                </div>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:6px;">
                  <tr>
                    <td style="width:24px; padding:0;">
                      <div style="width:24px; height:1px; line-height:1px; font-size:1px; background-color:#D2A85E; opacity:0.6;">&nbsp;</div>
                    </td>
                    <td style="padding:0 8px; font-family:'Oswald',Arial Narrow,Arial,sans-serif; font-size:9px; letter-spacing:6px; color:#F2E7CF; white-space:nowrap;">
                      BY&nbsp;DAVID
                    </td>
                    <td style="width:24px; padding:0;">
                      <div style="width:24px; height:1px; line-height:1px; font-size:1px; background-color:#D2A85E; opacity:0.6;">&nbsp;</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background-color:#1B1B1D; border:1px solid #2A2A2A; border-radius:10px; padding:40px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <div style="font-family:'Oswald',Arial Narrow,Arial,sans-serif; font-weight:500; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#D2A85E; margin-bottom:14px;">
                        ${opts.hasAccount ? 'Nový plán' : 'Pozvánka'}
                      </div>
                      <div style="font-family:'Oswald',Arial Narrow,Arial,sans-serif; font-weight:700; font-size:24px; text-transform:uppercase; letter-spacing:1px; color:#F2E7CF; line-height:1.15; margin-bottom:8px;">
                        ${heading}
                      </div>
                      <div style="width:40px; height:1px; background-color:#D2A85E; opacity:0.85; margin:0 auto 24px;"></div>
                      <div style="font-family:'Inter',Helvetica,Arial,sans-serif; font-size:14px; line-height:1.6; color:#B8B1A2; margin-bottom:8px;">
                        ${body}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:28px;">
                <div style="font-family:'Inter',Helvetica,Arial,sans-serif; font-size:11.5px; color:#6B6459;">
                  © Progress by David · progressbydavid.cz
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!RESEND_API_KEY) {
    return jsonResponse({ error: 'RESEND_API_KEY is not configured' }, 500)
  }

  const { intake_id } = await req.json().catch(() => ({}))
  if (!intake_id) {
    return jsonResponse({ error: 'intake_id is required' }, 400)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: intake, error: intakeError } = await supabase
    .from('client_intake')
    .select('full_name, email, trainer_id')
    .eq('id', intake_id)
    .single()

  if (intakeError || !intake) {
    return jsonResponse({ error: 'client_intake row not found' }, 404)
  }

  const { data: trainer } = await supabase.from('profiles').select('full_name').eq('id', intake.trainer_id).single()

  const { data: hasAccount } = await supabase.rpc('user_exists_with_email', { check_email: intake.email })

  const html = renderEmail({
    trainerName: trainer?.full_name ?? 'Tvůj trenér',
    clientName: intake.full_name,
    email: intake.email,
    hasAccount: Boolean(hasAccount),
  })

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Progress by David <${RESEND_FROM_EMAIL}>`,
      to: [intake.email],
      subject: hasAccount ? 'Byl/a jsi přidán/a do ProgressByMe' : 'Pozvánka do ProgressByMe',
      html,
    }),
  })

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text()
    return jsonResponse({ error: 'Resend request failed', details: errorText }, 502)
  }

  return jsonResponse({ ok: true, hasAccount: Boolean(hasAccount) })
})
