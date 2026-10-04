import { Pressable, Text, View } from 'react-native'

import { changeLanguage } from '@/i18n'
import { SUPPORTED_LANGUAGES, useLanguageStore } from '@/stores/language-store'

const LABELS: Record<string, string> = { cs: 'CS', en: 'EN', sk: 'SK' }

export function LanguageSwitcher({ className }: { className?: string }) {
  const language = useLanguageStore(state => state.language)

  return (
    <View className={`flex-row gap-1 ${className ?? ''}`}>
      {SUPPORTED_LANGUAGES.map(code => (
        <Pressable
          key={code}
          onPress={() => changeLanguage(code)}
          hitSlop={6}
          className={`min-h-9 min-w-9 items-center justify-center rounded px-2 py-1 active:opacity-70 ${language === code ? 'bg-gold' : 'bg-graph'}`}
        >
          <Text className={`font-display-medium text-[10px] tracking-[1px] ${language === code ? 'text-on-gold' : 'text-muted'}`}>
            {LABELS[code]}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}
