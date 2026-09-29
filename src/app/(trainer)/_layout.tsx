import { Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'

const headerOptions = {
  headerStyle: { backgroundColor: '#0A0A0B' },
  headerTintColor: '#D2A85E',
  headerTitleStyle: { fontFamily: 'Oswald_600SemiBold', color: '#F2E7CF' },
  headerShadowVisible: false,
}

export default function TrainerStackLayout() {
  const { t } = useTranslation()

  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="clients/index" options={{ title: t('trainer.clientsTitle'), headerShown: false }} />
      <Stack.Screen name="clients/new" options={{ title: t('trainer.addClient.title') }} />
      <Stack.Screen name="clients/[id]/index" options={{ title: t('trainer.clientDetailTitle') }} />
      <Stack.Screen name="clients/[id]/workout-builder" options={{ title: t('trainer.workoutBuilder.title') }} />
      <Stack.Screen name="clients/[id]/nutrition-builder" options={{ title: t('trainer.nutritionBuilder.title') }} />
      <Stack.Screen name="clients/[id]/checkins" options={{ title: t('trainer.checkinsTitle') }} />
      <Stack.Screen name="exercises/index" options={{ title: t('trainer.exerciseLibrary.title') }} />
      <Stack.Screen
        name="exercises/[id]"
        options={{ title: t('trainer.exerciseLibrary.newTitle') }}
      />
    </Stack>
  )
}
