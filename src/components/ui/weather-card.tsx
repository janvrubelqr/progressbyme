import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'

import type { WeatherState } from '@/hooks/use-weather'
import { isBadForOutdoorTraining, weatherCodeToGroup, type WeatherGroup } from '@/lib/weather'
import { pickTranslation } from '@/lib/pick-translation'
import { supabase } from '@/lib/supabase'
import { useLanguageStore } from '@/stores/language-store'

const GROUP_ICON: Record<WeatherGroup, ComponentProps<typeof Ionicons>['name']> = {
  clear: 'sunny-outline',
  cloudy: 'cloudy-outline',
  fog: 'cloud-outline',
  rain: 'rainy-outline',
  snow: 'snow-outline',
  thunder: 'thunderstorm-outline',
}

// Rule-based stand-in for the exercise picks the roadmap wants AI to make —
// pulls a few tagged indoor-cardio exercises from the library so the
// advisory suggests something concrete, not just "train inside".
function useIndoorCardioSuggestions(enabled: boolean) {
  const language = useLanguageStore(state => state.language)
  const [names, setNames] = useState<string[]>([])

  useEffect(() => {
    if (!enabled) {
      setNames([])
      return
    }

    supabase
      .from('exercises')
      .select('slug, exercise_translations(language_code, name)')
      .eq('movement_type', 'cardio')
      .eq('equipment', 'bodyweight')
      .limit(4)
      .then(({ data }) => {
        const rows = (data ?? []).map(row => {
          const translations = row.exercise_translations as { language_code: string; name: string }[]
          return pickTranslation(translations, language)?.name ?? row.slug
        })
        setNames(rows)
      })
  }, [enabled, language])

  return names
}

export function WeatherCard({ state, showOutdoorAdvisory }: { state: WeatherState; showOutdoorAdvisory: boolean }) {
  const { t } = useTranslation()

  const advisory = state.status === 'ready' && showOutdoorAdvisory && isBadForOutdoorTraining(state.data)
  const suggestions = useIndoorCardioSuggestions(advisory)

  if (state.status !== 'ready') return null

  const { data, locationName } = state
  const group = weatherCodeToGroup(data.weatherCode)

  return (
    <View className="mb-6 rounded-md border border-border bg-graph p-3">
      <View className="flex-row items-center gap-3">
        <Ionicons name={GROUP_ICON[group]} size={22} color="#D2A85E" />
        <View className="min-w-0 flex-1">
          <Text className="font-display-medium text-sm text-ivory" numberOfLines={1}>
            {Math.round(data.current.temperatureC)}°C{locationName ? ` · ${locationName}` : ''}
          </Text>
          <Text className="text-xs text-muted">
            {t(`home.weather.groups.${group}`)} · {t('home.weather.highLow', { high: Math.round(data.highC), low: Math.round(data.lowC) })}
          </Text>
        </View>
      </View>

      {advisory ? (
        <View className="mt-3 rounded-md border border-gold/30 bg-gold/10 p-2.5">
          <View className="flex-row items-start gap-2">
            <Ionicons name="information-circle" size={16} color="#D2A85E" style={{ marginTop: 1 }} />
            <Text className="flex-1 text-xs leading-4 text-ivory">{t('home.weather.outdoorAdvisory')}</Text>
          </View>
          {suggestions.length ? (
            <View className="ml-6 mt-2">
              <Text className="mb-1.5 text-[10px] uppercase tracking-[1px] text-muted">{t('home.weather.suggestionsLabel')}</Text>
              <View className="flex-row flex-wrap gap-1.5">
                {suggestions.map(name => (
                  <View key={name} className="rounded-full border border-gold/40 bg-coal px-2.5 py-1">
                    <Text className="text-[11px] text-gold">{name}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
