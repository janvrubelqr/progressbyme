import type { LanguageCode } from '@/stores/language-store'

const LOCALE_MAP: Record<LanguageCode, string> = {
  cs: 'cs-CZ',
  en: 'en-US',
  sk: 'sk-SK',
}

export function toDateLocale(language: LanguageCode): string {
  return LOCALE_MAP[language]
}
