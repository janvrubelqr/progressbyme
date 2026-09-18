import type { User } from '@supabase/supabase-js'
import { useEffect } from 'react'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { Profile } from '@/types/database'

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
    console.error('Chyba při vytváření profilu', createError)
    return null
  }

  return created as Profile
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
        setProfile(await fetchOrCreateProfile(session.user))
      }
      setIsInitializing(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return
      setSession(session)
      if (session?.user) {
        setProfile(await fetchOrCreateProfile(session.user))
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
