import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'

export const SUPPORTED_LANGUAGES = ['cs', 'en', 'sk'] as const
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]

const STORAGE_KEY = 'progressbyme.language'

type LanguageStore = {
  language: LanguageCode
  setLanguage: (language: LanguageCode) => void
}

export const useLanguageStore = create<LanguageStore>(set => ({
  language: 'cs',
  setLanguage: language => {
    set({ language })
    AsyncStorage.setItem(STORAGE_KEY, language).catch(() => {})
  },
}))

export async function loadPersistedLanguage(): Promise<LanguageCode | null> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY)
    if (value && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)) {
      return value as LanguageCode
    }
  } catch {
    // ignore — fall back to device/default language
  }
  return null
}
