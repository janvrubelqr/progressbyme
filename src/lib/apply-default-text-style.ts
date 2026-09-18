import { Text, TextInput } from 'react-native'

// Applies the Progress by David brand defaults (Inter body font, ivory text)
// globally, so screens don't need to repeat font-family/color on every <Text>.
export function applyDefaultTextStyle() {
  const RNText = Text as unknown as { defaultProps?: Record<string, unknown> }
  RNText.defaultProps = RNText.defaultProps ?? {}
  RNText.defaultProps.style = [{ fontFamily: 'Inter_400Regular', color: '#F2E7CF' }, RNText.defaultProps.style]

  const RNTextInput = TextInput as unknown as { defaultProps?: Record<string, unknown> }
  RNTextInput.defaultProps = RNTextInput.defaultProps ?? {}
  RNTextInput.defaultProps.style = [
    { fontFamily: 'Inter_400Regular', color: '#F2E7CF' },
    RNTextInput.defaultProps.style,
  ]
  RNTextInput.defaultProps.placeholderTextColor = '#948C7D'
  RNTextInput.defaultProps.cursorColor = '#D2A85E'
  RNTextInput.defaultProps.selectionColor = '#D2A85E'
}
