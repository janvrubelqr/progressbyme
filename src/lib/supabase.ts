import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import 'react-native-url-polyfill/auto'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Web needs this to pick up the ?code=... Supabase appends after an
    // OAuth (Google) redirect back to the app. Native handles that redirect
    // itself via expo-web-browser + exchangeCodeForSession (see use-auth.ts).
    detectSessionInUrl: Platform.OS === 'web',
  },
})
