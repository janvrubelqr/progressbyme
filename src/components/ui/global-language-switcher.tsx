import { usePathname } from 'expo-router'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { LanguageSwitcher } from '@/components/ui/language-switcher'

// Home (client) and Clients (trainer) render their own language switcher
// inline as part of a combined account row, so the global floating one
// would just duplicate it there.
const SCREENS_WITH_INLINE_SWITCHER = ['/home', '/clients']

export function GlobalLanguageSwitcher() {
  const insets = useSafeAreaInsets()
  const pathname = usePathname()

  if (SCREENS_WITH_INLINE_SWITCHER.includes(pathname)) return null

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
