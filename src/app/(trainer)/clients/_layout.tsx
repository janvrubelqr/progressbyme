import { Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { useThemeColors } from '@/hooks/use-theme-colors'

export default function ClientsStackLayout() {
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
      <Stack.Screen name="index" options={{ title: t('trainer.clientsTitle'), headerShown: false }} />
      <Stack.Screen name="new" options={{ title: t('trainer.addClient.title') }} />
      <Stack.Screen name="[id]/index" options={{ title: t('trainer.clientDetailTitle') }} />
      <Stack.Screen name="[id]/workout-builder" options={{ title: t('trainer.workoutBuilder.title') }} />
      <Stack.Screen name="[id]/nutrition-builder" options={{ title: t('trainer.nutritionBuilder.title') }} />
      <Stack.Screen name="[id]/checkins" options={{ title: t('trainer.checkinsTitle') }} />
    </Stack>
  )
}
