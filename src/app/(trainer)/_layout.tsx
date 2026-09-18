import { Stack } from 'expo-router'

const headerOptions = {
  headerStyle: { backgroundColor: '#0A0A0B' },
  headerTintColor: '#D2A85E',
  headerTitleStyle: { fontFamily: 'Oswald_600SemiBold', color: '#F2E7CF' },
  headerShadowVisible: false,
}

export default function TrainerStackLayout() {
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="clients/index" options={{ title: 'Klienti', headerShown: false }} />
      <Stack.Screen name="clients/[id]/index" options={{ title: 'Klient' }} />
      <Stack.Screen name="clients/[id]/workout-builder" options={{ title: 'Nový trénink' }} />
      <Stack.Screen name="clients/[id]/nutrition-builder" options={{ title: 'Nový jídelníček' }} />
      <Stack.Screen name="clients/[id]/checkins" options={{ title: 'Check-iny' }} />
    </Stack>
  )
}
