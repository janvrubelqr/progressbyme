import { Text, View } from 'react-native'

export type Message = { type: 'success' | 'error'; text: string }

export function MessageBanner({ message }: { message: Message | null }) {
  if (!message) return null

  const isError = message.type === 'error'

  return (
    <View className={`mt-2 rounded-md border px-3 py-2 ${isError ? 'border-red-900 bg-red-950' : 'border-gold/40 bg-gold-50'}`}>
      <Text className={`text-sm ${isError ? 'text-red-300' : 'text-gold'}`}>{message.text}</Text>
    </View>
  )
}
