import { Text, TextInput, View, type TextInputProps } from 'react-native'

type TextFieldProps = TextInputProps & {
  label: string
  containerClassName?: string
  error?: string | null
}

export function TextField({ label, containerClassName, className, error, ...props }: TextFieldProps) {
  return (
    <View className={`mb-4 ${containerClassName ?? ''}`}>
      <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">{label}</Text>
      <TextInput
        className={`rounded-md border ${error ? 'border-red-800' : 'border-border'} bg-graph px-4 py-3 text-base text-ivory ${className ?? ''}`}
        {...props}
      />
      {error ? <Text className="mt-1.5 text-xs text-red-400">{error}</Text> : null}
    </View>
  )
}
