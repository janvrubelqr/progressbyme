import type { User } from '@supabase/supabase-js'
import { useEffect } from 'react'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { ClientIntake, Profile } from '@/types/database'

async function fetchOrCreateProfile(user: User): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()

  if (error) {
    console.error('Chyba při načítání profilu', error)
    return null
  }

  if (data) {
    return data as Profile
  }

  // No profile yet — this is the first authenticated request for this user
  // (e.g. right after confirming their email), so create it now.
  const { data: created, error: createError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
      role: 'client',
    })
    .select('*')
    .single()

  if (createError) {
    // getSession() and onAuthStateChange both call this on mount, so two
    // concurrent inserts for the same brand-new user are expected — the
    // loser just re-fetches the row the winner created instead of erroring.
    if (createError.code === '23505') {
      const { data: existing } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      return (existing as Profile) ?? null
    }

    console.error('Chyba při vytváření profilu', createError)
    return null
  }

  return created as Profile
}

// If a trainer added this person as a prospective client before they signed
// up (client_intake, matched by email), link them to that trainer now and
// copy over the starting info the trainer already entered.
async function tryClaimIntake(user: User, profile: Profile): Promise<Profile> {
  if (profile.trainer_id || !user.email) return profile

  const { data: intake } = await supabase
    .from('client_intake')
    .select('*')
    .eq('email', user.email)
    .is('claimed_by', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!intake) return profile

  const row = intake as ClientIntake

  const profilePatch: Partial<Profile> = { trainer_id: row.trainer_id }
  if (!profile.sex && row.sex) profilePatch.sex = row.sex
  if (!profile.height_cm && row.height_cm) profilePatch.height_cm = row.height_cm
  if (!profile.fitness_goal && row.fitness_goal) profilePatch.fitness_goal = row.fitness_goal
  if (!profile.phone && row.phone) profilePatch.phone = row.phone

  const { data: updatedProfile } = await supabase
    .from('profiles')
    .update(profilePatch)
    .eq('id', user.id)
    .select('*')
    .single()

  // Claim guard: the RLS policy only allows this update while claimed_by is
  // still null, so a duplicate/racing call here is a harmless no-op.
  await supabase.from('client_intake').update({ claimed_by: user.id, claimed_at: new Date().toISOString() }).eq('id', row.id)

  if (row.weight_kg) {
    await supabase
      .from('weight_logs')
      .upsert(
        { client_id: user.id, date: new Date().toISOString().slice(0, 10), weight_kg: row.weight_kg },
        { onConflict: 'client_id,date' }
      )
  }

  return (updatedProfile as Profile) ?? profile
}

// Dev-only convenience: if EXPO_PUBLIC_DEV_AUTO_LOGIN_EMAIL/PASSWORD are set in .env.local,
// silently sign in with that account on boot instead of showing the login screen.
// Leave them unset (or remove them) to get the normal login flow back.
async function devAutoLogin() {
  const email = process.env.EXPO_PUBLIC_DEV_AUTO_LOGIN_EMAIL
  const password = process.env.EXPO_PUBLIC_DEV_AUTO_LOGIN_PASSWORD

  if (!email || !password) return

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    console.warn('Dev auto-login selhal', error.message)
  }
}

export function useAuthSession() {
  const setSession = useAuthStore(state => state.setSession)
  const setProfile = useAuthStore(state => state.setProfile)
  const setIsInitializing = useAuthStore(state => state.setIsInitializing)

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return

      if (!session) {
        await devAutoLogin()
        const { data } = await supabase.auth.getSession()
        session = data.session
      }

      setSession(session)
      if (session?.user) {
        const profile = await fetchOrCreateProfile(session.user)
        setProfile(profile ? await tryClaimIntake(session.user, profile) : profile)
      }
      setIsInitializing(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return
      setSession(session)
      if (session?.user) {
        const profile = await fetchOrCreateProfile(session.user)
        setProfile(profile ? await tryClaimIntake(session.user, profile) : profile)
      } else {
        setProfile(null)
      }
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [setSession, setProfile, setIsInitializing])
}
