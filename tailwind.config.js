/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Progress by David brand tokens (progressbydavid.cz)
        coal: '#0A0A0B',
        graph: '#1B1B1D',
        gold: {
          DEFAULT: '#D2A85E',
          50: '#221C10',
          400: '#D2A85E',
          500: '#D2A85E',
          600: '#B88332',
          rich: '#B88332',
        },
        ivory: '#F2E7CF',
        stone: {
          DEFAULT: '#D8D2C6',
          card: '#E8E4DA',
          line: '#C2BBAC',
          gold: '#8A6A28',
        },
        border: '#2A2A2A',
        'border-soft': '#262626',
        surface: '#0A0A0B',
        card: '#1B1B1D',
        ink: '#F2E7CF',
        muted: '#948C7D',
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
