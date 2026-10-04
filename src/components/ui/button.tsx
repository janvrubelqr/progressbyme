import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native'

type ButtonProps = PressableProps & {
  label: string
  variant?: 'primary' | 'ghost'
  isLoading?: boolean
}

export function Button({ label, variant = 'primary', isLoading, disabled, className, ...props }: ButtonProps) {
  const isGhost = variant === 'ghost'

  return (
    <Pressable
      disabled={disabled || isLoading}
      className={`min-h-12 items-center justify-center rounded py-4 active:opacity-70 ${
        isGhost ? 'border border-gold bg-transparent' : 'bg-gold'
      } ${disabled || isLoading ? 'opacity-60' : ''} ${className ?? ''}`}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={isGhost ? '#D2A85E' : '#0A0A0B'} />
      ) : (
        <Text
          className={`font-display text-[13px] uppercase tracking-[2px] ${isGhost ? 'text-gold' : 'text-on-gold'}`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}
