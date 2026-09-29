import { View, type ViewProps } from 'react-native'

export function Card({ className, ...props }: ViewProps) {
  return <View className={`rounded-[10px] border border-border bg-card p-4 active:opacity-70 ${className ?? ''}`} {...props} />
}
