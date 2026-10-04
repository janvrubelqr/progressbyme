import { Text, TextInput } from 'react-native'

type DefaultTextColors = { ink: string; placeholder: string; gold: string }

// Applies the Progress by David brand defaults (Inter body font, themed ink
// color) globally, so screens don't need to repeat font-family/color on
// every <Text>. Re-run this from a useEffect keyed on the resolved theme
// (see RootLayout) so the defaults track light/dark — defaultProps is a
// one-time mutation, so a screen already mounted when the theme changes
// won't repaint until it next re-renders or remounts.
export function applyDefaultTextStyle({ ink, placeholder, gold }: DefaultTextColors) {
  const RNText = Text as unknown as { defaultProps?: Record<string, unknown> }
  RNText.defaultProps = RNText.defaultProps ?? {}
  RNText.defaultProps.style = { fontFamily: 'Inter_400Regular', color: ink }

  const RNTextInput = TextInput as unknown as { defaultProps?: Record<string, unknown> }
  RNTextInput.defaultProps = RNTextInput.defaultProps ?? {}
  RNTextInput.defaultProps.style = { fontFamily: 'Inter_400Regular', color: ink }
  RNTextInput.defaultProps.placeholderTextColor = placeholder
  RNTextInput.defaultProps.cursorColor = gold
  RNTextInput.defaultProps.selectionColor = gold
}
