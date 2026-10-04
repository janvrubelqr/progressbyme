import AsyncStorage from '@react-native-async-storage/async-storage'
import { colorScheme } from 'nativewind'
import { create } from 'zustand'

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]

const STORAGE_KEY = 'progressbyme.theme'

type ThemeStore = {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

export const useThemeStore = create<ThemeStore>(set => ({
  preference: 'system',
  setPreference: preference => {
    set({ preference })
    colorScheme.set(preference)
    AsyncStorage.setItem(STORAGE_KEY, preference).catch(() => {})
  },
}))

export async function loadPersistedThemePreference(): Promise<ThemePreference> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY)
    if (value && (THEME_PREFERENCES as readonly string[]).includes(value)) {
      return value as ThemePreference
    }
  } catch {
    // ignore — fall back to system
  }
  return 'system'
}
