import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'

import type { Profile } from '@/types/database'

type AuthStore = {
  session: Session | null
  user: User | null
  profile: Profile | null
  isInitializing: boolean
  isSubmitting: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setIsInitializing: (isInitializing: boolean) => void
  setIsSubmitting: (isSubmitting: boolean) => void
}

export const useAuthStore = create<AuthStore>(set => ({
  session: null,
  user: null,
  profile: null,
  isInitializing: true,
  isSubmitting: false,
  setSession: session => set({ session, user: session?.user ?? null }),
  setProfile: profile => set({ profile }),
  setIsInitializing: isInitializing => set({ isInitializing }),
  setIsSubmitting: isSubmitting => set({ isSubmitting }),
}))
