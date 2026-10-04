/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Progress by David brand tokens (progressbydavid.cz).
        // coal/graph/ivory/border(-soft) and their surface/card/ink/muted
        // aliases all resolve through CSS variables defined in global.css,
        // so they automatically swap between the light and dark palette —
        // every screen still using bg-coal/text-ivory/etc. gets theming for
        // free, no per-screen edits needed. gold and stone stay fixed: the
        // brand accent and the light-neutral family don't flip per theme.
        coal: 'rgb(var(--color-surface) / <alpha-value>)',
        graph: 'rgb(var(--color-card) / <alpha-value>)',
        ivory: 'rgb(var(--color-ink) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        card: 'rgb(var(--color-card) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        'muted-soft': 'rgb(var(--color-muted-soft) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        'border-soft': 'rgb(var(--color-border-soft) / <alpha-value>)',
        good: 'rgb(var(--color-good) / <alpha-value>)',
        gold: {
          DEFAULT: '#D2A85E',
          50: '#221C10',
          400: '#D2A85E',
          500: '#D2A85E',
          600: '#B88332',
          rich: '#B88332',
        },
        // Fixed dark text/icon color for content sitting on the gold fill
        // (selected chips, primary buttons) — gold doesn't flip per theme,
        // so this can't be `coal`/`ink`, which do.
        'on-gold': '#0A0A0B',
        stone: {
          DEFAULT: '#D8D2C6',
          card: '#E8E4DA',
          line: '#C2BBAC',
          gold: '#8A6A28',
        },
      },
      fontFamily: {
        display: ['Oswald_600SemiBold'],
        'display-bold': ['Oswald_700Bold'],
        'display-medium': ['Oswald_500Medium'],
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-light': ['Inter_300Light'],
      },
    },
  },
  plugins: [],
}
