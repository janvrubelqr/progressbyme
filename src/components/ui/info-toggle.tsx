import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { useThemeColors } from '@/hooks/use-theme-colors'

export function InfoToggle({ text, className }: { text: string; className?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const theme = useThemeColors()

  return (
    <View className={`min-w-0 shrink ${className ?? ''}`}>
      <Pressable onPress={() => setIsOpen(prev => !prev)} hitSlop={14} className="active:opacity-60">
        <Ionicons name={isOpen ? 'information-circle' : 'information-circle-outline'} size={15} color={theme.muted} />
      </Pressable>
      {isOpen ? (
        <View className="mt-2 rounded-md border border-border bg-graph p-2.5">
          <Text className="text-[11px] leading-4 text-muted">{text}</Text>
        </View>
      ) : null}
    </View>
  )
}
