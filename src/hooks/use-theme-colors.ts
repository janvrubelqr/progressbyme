import { useColorScheme } from 'nativewind'

// Mirrors the CSS variables in global.css — same palette, as hex, for the
// spots NativeWind's className can't reach: icon `color` props,
// Animated.View inline styles, StatusBar, Stack `contentStyle`.
const PALETTES = {
  light: {
    surface: '#F5F2EA',
    card: '#FCFBF7',
    ink: '#1C1A15',
    muted: '#756C5C',
    mutedSoft: '#C4BDAE',
    placeholder: '#9B9284',
    border: '#C2BBAC',
    borderSoft: '#D6CFC0',
    good: '#168E4F',
  },
  dark: {
    surface: '#0A0A0B',
    card: '#1B1B1D',
    ink: '#F2E7CF',
    muted: '#948C7D',
    mutedSoft: '#3A362F',
    placeholder: '#5A564C',
    border: '#2A2A2A',
    borderSoft: '#262626',
    good: '#4CD97B',
  },
} as const

// Fixed brand colors — same in both themes.
export const BRAND_COLORS = {
  gold: '#D2A85E',
  goldRich: '#B88332',
}

export function useThemeColors() {
  const { colorScheme } = useColorScheme()
  const resolved = colorScheme === 'light' ? 'light' : 'dark'
  return { ...PALETTES[resolved], ...BRAND_COLORS, scheme: resolved }
}
