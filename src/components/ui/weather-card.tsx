import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'

import type { WeatherState } from '@/hooks/use-weather'
import { isBadForOutdoorTraining, weatherCodeToGroup, type WeatherGroup } from '@/lib/weather'

const GROUP_ICON: Record<WeatherGroup, ComponentProps<typeof Ionicons>['name']> = {
  clear: 'sunny-outline',
  cloudy: 'cloudy-outline',
  fog: 'cloud-outline',
  rain: 'rainy-outline',
  snow: 'snow-outline',
  thunder: 'thunderstorm-outline',
}

export function WeatherCard({ state, showOutdoorAdvisory }: { state: WeatherState; showOutdoorAdvisory: boolean }) {
  const { t } = useTranslation()

  if (state.status !== 'ready') return null

  const { data, locationName } = state
  const group = weatherCodeToGroup(data.weatherCode)
  const advisory = showOutdoorAdvisory && isBadForOutdoorTraining(data)

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
        <View className="mt-3 flex-row items-start gap-2 rounded-md border border-gold/30 bg-gold/10 p-2.5">
          <Ionicons name="information-circle" size={16} color="#D2A85E" style={{ marginTop: 1 }} />
          <Text className="flex-1 text-xs leading-4 text-ivory">{t('home.weather.outdoorAdvisory')}</Text>
        </View>
      ) : null}
    </View>
  )
}
