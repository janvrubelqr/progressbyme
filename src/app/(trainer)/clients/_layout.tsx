import { Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'

const headerOptions = {
  headerStyle: { backgroundColor: '#0A0A0B' },
  headerTintColor: '#D2A85E',
  headerTitleStyle: { fontFamily: 'Oswald_600SemiBold', color: '#F2E7CF' },
  headerShadowVisible: false,
}

export default function ClientsStackLayout() {
  const { t } = useTranslation()

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
