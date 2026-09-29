import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, Text, View, type PressableProps } from 'react-native'

type GoogleButtonProps = Omit<PressableProps, 'children'> & { isLoading?: boolean }

export function GoogleButton({ isLoading, disabled, className, ...props }: GoogleButtonProps) {
  const { t } = useTranslation()

  return (
    <Pressable
      disabled={disabled || isLoading}
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded border border-border bg-graph py-4 active:opacity-70 ${
        disabled || isLoading ? 'opacity-60' : ''
      } ${className ?? ''}`}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color="#F2E7CF" />
      ) : (
        <>
          <Ionicons name="logo-google" size={16} color="#F2E7CF" />
          <Text className="font-display text-[13px] uppercase tracking-[1px] text-ivory">
            {t('auth.continueWithGoogle')}
          </Text>
        </>
      )}
    </Pressable>
  )
}

export function OrDivider() {
  const { t } = useTranslation()

  return (
    <View className="my-5 flex-row items-center gap-3">
      <View className="h-px flex-1 bg-border" />
      <Text className="font-sans-medium text-xs uppercase tracking-[1px] text-muted">{t('auth.or')}</Text>
      <View className="h-px flex-1 bg-border" />
    </View>
  )
}
