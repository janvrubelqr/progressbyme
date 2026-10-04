import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Text, View } from 'react-native'

import { useThemeColors } from '@/hooks/use-theme-colors'

export type SaveState = 'idle' | 'saving' | 'saved'

export function SaveStatus({ state, className }: { state: SaveState; className?: string }) {
  const { t } = useTranslation()
  const theme = useThemeColors()

  if (state === 'idle') return null

  return (
    <View className={`flex-row items-center gap-1.5 ${className ?? ''}`}>
      {state === 'saving' ? (
        <ActivityIndicator size="small" color={theme.muted} />
      ) : (
        <Ionicons name="checkmark-circle" size={13} color={theme.good} />
      )}
      <Text className="text-[11px] text-muted">{state === 'saving' ? t('common.saving') : t('common.saved')}</Text>
    </View>
  )
}
