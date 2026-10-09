import { usePathname } from 'expo-router'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { ThemeSwitcher } from '@/components/ui/theme-switcher'

// Home (client) and Clients (trainer) render their own language/theme
// switchers inline as part of a combined account row, so the global
// floating ones would just duplicate them there. My Account also has its
// own full (text-labeled) theme control, so skip the compact one there too.
const SCREENS_WITH_INLINE_SWITCHER = ['/home', '/clients']
const SCREENS_WITH_OWN_THEME_CONTROL = [...SCREENS_WITH_INLINE_SWITCHER, '/profile']

export function GlobalLanguageSwitcher() {
  const insets = useSafeAreaInsets()
  const pathname = usePathname()

  const showLanguage = !SCREENS_WITH_INLINE_SWITCHER.includes(pathname)
  const showTheme = !SCREENS_WITH_OWN_THEME_CONTROL.includes(pathname)

  if (!showLanguage && !showTheme) return null

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 6,
        paddingTop: insets.top + 10,
        paddingRight: 14,
        zIndex: 50,
      }}
    >
      {showTheme ? <ThemeSwitcher /> : null}
      {showLanguage ? <LanguageSwitcher /> : null}
    </View>
  )
}
