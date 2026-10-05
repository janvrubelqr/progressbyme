import '@/global.css'

import { Inter_300Light, Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter'
import { Oswald_500Medium, Oswald_600SemiBold, Oswald_700Bold } from '@expo-google-fonts/oswald'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import * as WebBrowser from 'expo-web-browser'
import { useFonts } from 'expo-font'
import { useEffect, useState } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { GlobalLanguageSwitcher } from '@/components/ui/global-language-switcher'
import { useAuthSession } from '@/hooks/use-auth-session'
import { useThemeColors } from '@/hooks/use-theme-colors'
import { initI18n } from '@/i18n'
import { applyDefaultTextStyle } from '@/lib/apply-default-text-style'
import { useAuthStore } from '@/stores/auth-store'
import { loadPersistedThemePreference, useThemeStore } from '@/stores/theme-store'

SplashScreen.preventAutoHideAsync()

// Lets a popup/tab-based Google auth flow report back to the opener — a
// no-op on redirect-based flows, but recommended boilerplate either way.
WebBrowser.maybeCompleteAuthSession()

export default function RootLayout() {
  useAuthSession()

  const [fontsLoaded] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  })

  const [i18nReady, setI18nReady] = useState(false)
  useEffect(() => {
    initI18n().then(() => setI18nReady(true))
  }, [])

  const setThemePreference = useThemeStore(state => state.setPreference)
  const [themeReady, setThemeReady] = useState(false)
  useEffect(() => {
    loadPersistedThemePreference().then(preference => {
      setThemePreference(preference)
      setThemeReady(true)
    })
  }, [setThemePreference])

  const session = useAuthStore(state => state.session)
  const profile = useAuthStore(state => state.profile)
  const isInitializing = useAuthStore(state => state.isInitializing)
  const theme = useThemeColors()

  useEffect(() => {
    applyDefaultTextStyle({ ink: theme.ink, placeholder: theme.placeholder, gold: theme.gold })
  }, [theme.ink, theme.placeholder, theme.gold])

  const isReady = fontsLoaded && i18nReady && themeReady && !isInitializing

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync()
    }
  }, [isReady])

  if (!isReady) {
    return null
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.surface } }}>
        <Stack.Screen name="index" />

        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
        </Stack.Protected>

        <Stack.Protected guard={!!session && profile?.role === 'client' && !profile?.onboarding_completed_at}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>

        <Stack.Protected guard={!!session && profile?.role === 'client'}>
          <Stack.Screen name="(client)" />
        </Stack.Protected>

        <Stack.Protected guard={!!session && profile?.role === 'trainer'}>
          <Stack.Screen name="(trainer)" />
        </Stack.Protected>
      </Stack>
      <GlobalLanguageSwitcher />
    </SafeAreaProvider>
  )
}
