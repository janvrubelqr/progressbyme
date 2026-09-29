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
import { initI18n } from '@/i18n'
import { applyDefaultTextStyle } from '@/lib/apply-default-text-style'
import { useAuthStore } from '@/stores/auth-store'

SplashScreen.preventAutoHideAsync()

applyDefaultTextStyle()

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

  const session = useAuthStore(state => state.session)
  const profile = useAuthStore(state => state.profile)
  const isInitializing = useAuthStore(state => state.isInitializing)

  const isReady = fontsLoaded && i18nReady && !isInitializing

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
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0B' } }}>
        <Stack.Screen name="index" />

        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
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
