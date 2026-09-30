import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Text, View } from 'react-native'

export type SaveState = 'idle' | 'saving' | 'saved'

export function SaveStatus({ state, className }: { state: SaveState; className?: string }) {
  const { t } = useTranslation()

  if (state === 'idle') return null

  return (
    <View className={`flex-row items-center gap-1.5 ${className ?? ''}`}>
      {state === 'saving' ? (
        <ActivityIndicator size="small" color="#948C7D" />
      ) : (
        <Ionicons name="checkmark-circle" size={13} color="#4CD97B" />
      )}
      <Text className="text-[11px] text-muted">{state === 'saving' ? t('common.saving') : t('common.saved')}</Text>
    </View>
  )
}
