import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { Pressable, Text } from 'react-native'

import { useThemeColors } from '@/hooks/use-theme-colors'

export function SignOutButton({ onPress, className }: { onPress: () => void; className?: string }) {
  const { t } = useTranslation()
  const theme = useThemeColors()

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      className={`flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1.5 active:opacity-60 ${className ?? ''}`}
    >
      <Ionicons name="log-out-outline" size={14} color={theme.muted} />
      <Text className="font-sans-medium text-xs text-muted">{t('trainer.signOut')}</Text>
    </Pressable>
  )
}
