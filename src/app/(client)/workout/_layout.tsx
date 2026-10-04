import { Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { useThemeColors } from '@/hooks/use-theme-colors'

export default function WorkoutStackLayout() {
  const { t } = useTranslation()
  const theme = useThemeColors()

  const headerOptions = {
    headerStyle: { backgroundColor: theme.surface },
    headerTintColor: theme.gold,
    headerTitleStyle: { fontFamily: 'Oswald_600SemiBold', color: theme.ink },
    headerShadowVisible: false,
  }

  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: t('workout.detailTitle') }} />
    </Stack>
  )
}
