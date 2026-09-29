import * as Localization from 'expo-localization'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import cs from './locales/cs.json'
import en from './locales/en.json'
import sk from './locales/sk.json'
import { loadPersistedLanguage, SUPPORTED_LANGUAGES, useLanguageStore, type LanguageCode } from '@/stores/language-store'

const resources = { cs: { translation: cs }, en: { translation: en }, sk: { translation: sk } }

function detectDeviceLanguage(): LanguageCode {
  const deviceLanguage = Localization.getLocales()[0]?.languageCode
  if (deviceLanguage && (SUPPORTED_LANGUAGES as readonly string[]).includes(deviceLanguage)) {
    return deviceLanguage as LanguageCode
  }
  return 'cs'
}

let initPromise: Promise<void> | null = null

export function initI18n(): Promise<void> {
  if (initPromise) return initPromise

  initPromise = (async () => {
    const persisted = await loadPersistedLanguage()
    const language = persisted ?? detectDeviceLanguage()

    await i18n.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: 'cs',
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v4',
    })

    useLanguageStore.setState({ language })
  })()

  return initPromise
}

export function changeLanguage(language: LanguageCode) {
  i18n.changeLanguage(language)
  useLanguageStore.getState().setLanguage(language)
}

export default i18n
