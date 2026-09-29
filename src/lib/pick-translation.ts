export function pickTranslation<T extends { language_code: string }>(translations: T[], language: string): T | undefined {
  return (
    translations.find(t => t.language_code === language) ??
    translations.find(t => t.language_code === 'en') ??
    translations.find(t => t.language_code === 'cs') ??
    translations[0]
  )
}
