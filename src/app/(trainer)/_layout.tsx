import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'

export default function TrainerTabsLayout() {
  const { t } = useTranslation()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#D2A85E',
        tabBarInactiveTintColor: '#6B6459',
        tabBarStyle: {
          backgroundColor: '#0A0A0B',
          borderTopColor: '#1B1B1D',
        },
        tabBarLabelStyle: {
          fontFamily: 'Oswald_500Medium',
          fontSize: 10,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="clients"
        options={{
          title: t('trainer.tabs.clients'),
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: t('trainer.tabs.exercises'),
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
