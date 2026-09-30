import * as Location from 'expo-location'
import { useEffect, useState } from 'react'

import { fetchDailyWeather, reverseGeocodeCityName, type DailyWeather } from '@/lib/weather'

export type WeatherState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'ready'; data: DailyWeather; locationName: string | null }

// Single shared location+weather fetch for the home screen — requests
// foreground permission once and hands the result to whichever components
// need it (weather summary card, water tracker's climate correction),
// instead of each one prompting/fetching independently.
export function useWeather(language: string): WeatherState {
  const [state, setState] = useState<WeatherState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' as const }))
      if (status !== 'granted') {
        if (!cancelled) setState({ status: 'unavailable' })
        return
      }

      const position = await Location.getCurrentPositionAsync({}).catch(() => null)
      if (!position) {
        if (!cancelled) setState({ status: 'unavailable' })
        return
      }

      const [daily, locationName] = await Promise.all([
        fetchDailyWeather(position.coords.latitude, position.coords.longitude),
        reverseGeocodeCityName(position.coords.latitude, position.coords.longitude, language),
      ])
      if (cancelled) return

      if (!daily) {
        setState({ status: 'unavailable' })
        return
      }

      setState({ status: 'ready', data: daily, locationName })
    })()

    return () => {
      cancelled = true
    }
  }, [language])

  return state
}
