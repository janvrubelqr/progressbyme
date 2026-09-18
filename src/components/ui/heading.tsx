import { Text, View, type TextProps } from 'react-native'

type HeadingProps = TextProps & {
  underline?: boolean
}

export function Heading({ className, underline, children, ...props }: HeadingProps) {
  return (
    <View>
      <Text className={`font-display-bold text-2xl uppercase tracking-[1px] text-ivory ${className ?? ''}`} {...props}>
        {children}
      </Text>
      {underline ? <View className="mt-3 h-px w-10 bg-gold" /> : null}
    </View>
  )
}

export function Eyebrow({ className, children, ...props }: TextProps) {
  return (
    <Text
      className={`font-display-medium text-[11px] uppercase tracking-[3px] text-gold ${className ?? ''}`}
      {...props}
    >
      {children}
    </Text>
  )
}
