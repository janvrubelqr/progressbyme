import { Pressable, Text, View } from 'react-native'

type ChipOption<T extends string> = { value: T; label: string }

export function ChipSelect<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: ChipOption<T>[]
  value: T | null
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <View className={`flex-row flex-wrap gap-2 ${className ?? ''}`}>
      {options.map(option => (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          hitSlop={6}
          className={`min-h-11 justify-center rounded-full border px-3 py-2 active:opacity-70 ${
            value === option.value ? 'border-gold bg-gold' : 'border-border bg-graph'
          }`}
        >
          <Text className={`font-sans-medium text-xs ${value === option.value ? 'text-coal' : 'text-ivory'}`}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}
