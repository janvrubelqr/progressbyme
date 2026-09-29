import { useTranslation } from 'react-i18next'
import { Pressable, Text } from 'react-native'

import { useSwitchRole } from '@/hooks/use-switch-role'

export function RoleSwitch({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { switchRole, currentRole } = useSwitchRole()

  if (!currentRole) return null

  return (
    <Pressable onPress={switchRole} hitSlop={8} className={`active:opacity-60 ${className ?? ''}`}>
      <Text className="font-sans-medium text-xs text-muted">
        {currentRole === 'trainer' ? t('roleSwitch.toClient') : t('roleSwitch.toTrainer')}
      </Text>
    </Pressable>
  )
}
