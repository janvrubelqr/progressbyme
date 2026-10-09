import { Ionicons } from '@expo/vector-icons'
import { Pressable, View } from 'react-native'

import { useThemeColors } from '@/hooks/use-theme-colors'
import { THEME_PREFERENCES, useThemeStore, type ThemePreference } from '@/stores/theme-store'

const ICON: Record<ThemePreference, keyof typeof Ionicons.glyphMap> = {
  system: 'phone-portrait-outline',
  light: 'sunny-outline',
  dark: 'moon-outline',
}

export function ThemeSwitcher({ className }: { className?: string }) {
  const preference = useThemeStore(state => state.preference)
  const setPreference = useThemeStore(state => state.setPreference)
  const theme = useThemeColors()

  return (
    <View className={`flex-row gap-1 ${className ?? ''}`}>
      {THEME_PREFERENCES.map(pref => (
        <Pressable
          key={pref}
          onPress={() => setPreference(pref)}
          hitSlop={6}
          className={`h-9 min-w-9 items-center justify-center rounded px-2 py-1 active:opacity-70 ${
            preference === pref ? 'bg-gold' : 'bg-graph'
          }`}
        >
          {/* Fixed dark icon color on the gold-filled active state — gold
              doesn't flip per theme, so this can't use a theme-reactive
              color (same reasoning as the `on-gold` Tailwind token). */}
          <Ionicons name={ICON[pref]} size={14} color={preference === pref ? '#0A0A0B' : theme.muted} />
        </Pressable>
      ))}
    </View>
  )
}
