import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { LanguageSwitcher } from '@/components/ui/language-switcher'

export function GlobalLanguageSwitcher() {
  const insets = useSafeAreaInsets()

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'flex-end',
        paddingTop: insets.top + 10,
        paddingRight: 14,
        zIndex: 50,
      }}
    >
      <LanguageSwitcher />
    </View>
  )
}
