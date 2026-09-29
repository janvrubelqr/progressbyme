import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { UserRole } from '@/types/database'

export function useSwitchRole() {
  const profile = useAuthStore(state => state.profile)
  const setProfile = useAuthStore(state => state.setProfile)

  const switchRole = async () => {
    if (!profile) return

    const nextRole: UserRole = profile.role === 'trainer' ? 'client' : 'trainer'

    const { data, error } = await supabase
      .from('profiles')
      .update({ role: nextRole })
      .eq('id', profile.id)
      .select('*')
      .single()

    if (!error && data) {
      // Updating the store's profile is enough — the root layout's
      // Stack.Protected guards react to it and navigate automatically.
      setProfile(data)
    }
  }

  return { switchRole, currentRole: profile?.role }
}
