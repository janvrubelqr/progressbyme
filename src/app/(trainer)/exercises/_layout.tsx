import { Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'

const headerOptions = {
  headerStyle: { backgroundColor: '#0A0A0B' },
  headerTintColor: '#D2A85E',
  headerTitleStyle: { fontFamily: 'Oswald_600SemiBold', color: '#F2E7CF' },
  headerShadowVisible: false,
}

export default function ExercisesStackLayout() {
  const { t } = useTranslation()

  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: t('trainer.exerciseLibrary.title'), headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: t('trainer.exerciseLibrary.newTitle') }} />
    </Stack>
  )
}
