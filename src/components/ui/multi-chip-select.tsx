import { Pressable, Text, View } from 'react-native'

type ChipOption<T extends string> = { value: T; label: string }

export function MultiChipSelect<T extends string>({
  options,
  values,
  onChange,
  className,
}: {
  options: ChipOption<T>[]
  values: T[]
  onChange: (values: T[]) => void
  className?: string
}) {
  const toggle = (value: T) => {
    onChange(values.includes(value) ? values.filter(v => v !== value) : [...values, value])
  }

  return (
    <View className={`flex-row flex-wrap gap-2 ${className ?? ''}`}>
      {options.map(option => {
        const isSelected = values.includes(option.value)
        return (
          <Pressable
            key={option.value}
            onPress={() => toggle(option.value)}
            hitSlop={6}
            className={`min-h-11 justify-center rounded-full border px-3 py-2 active:opacity-70 ${isSelected ? 'border-gold bg-gold' : 'border-border bg-graph'}`}
          >
            <Text className={`font-sans-medium text-xs ${isSelected ? 'text-coal' : 'text-ivory'}`}>{option.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}
