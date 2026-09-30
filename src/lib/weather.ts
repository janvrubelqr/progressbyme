// Best-effort weather lookups (no API key — Open-Meteo and BigDataCloud's
// reverse-geocode-client endpoint are both free and CORS-friendly for direct
// client calls). Used for the water goal's climate correction and the
// client home screen's weather summary — see knowledge-base/hydration-guidelines.md.

export type CurrentWeather = { temperatureC: number; humidityPct: number }

export type WeatherCode = number

export type DailyWeather = {
  current: CurrentWeather
  highC: number
  lowC: number
  precipitationProbabilityMax: number
  weatherCode: WeatherCode
}

export async function fetchCurrentWeather(latitude: number, longitude: number): Promise<CurrentWeather | null> {
  const daily = await fetchDailyWeather(latitude, longitude)
  return daily?.current ?? null
}

export async function fetchDailyWeather(latitude: number, longitude: number): Promise<DailyWeather | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
      `&timezone=auto`
    const response = await fetch(url)
    if (!response.ok) return null

    const data = await response.json()
    const temperatureC = data?.current?.temperature_2m
    const humidityPct = data?.current?.relative_humidity_2m
    const highC = data?.daily?.temperature_2m_max?.[0]
    const lowC = data?.daily?.temperature_2m_min?.[0]
    const precipitationProbabilityMax = data?.daily?.precipitation_probability_max?.[0]
    const weatherCode = data?.daily?.weather_code?.[0]

    if (
      typeof temperatureC !== 'number' ||
      typeof humidityPct !== 'number' ||
      typeof highC !== 'number' ||
      typeof lowC !== 'number' ||
      typeof weatherCode !== 'number'
    ) {
      return null
    }

    return {
      current: { temperatureC, humidityPct },
      highC,
      lowC,
      precipitationProbabilityMax: precipitationProbabilityMax ?? 0,
      weatherCode,
    }
  } catch {
    return null
  }
}

export async function reverseGeocodeCityName(latitude: number, longitude: number, language: string): Promise<string | null> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=${language}`
    const response = await fetch(url)
    if (!response.ok) return null

    const data = await response.json()
    return (data?.city as string) || (data?.locality as string) || (data?.principalSubdivision as string) || null
  } catch {
    return null
  }
}

// WMO weather codes grouped into the handful of icons/descriptions the UI needs.
export type WeatherGroup = 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'thunder'

export function weatherCodeToGroup(code: WeatherCode): WeatherGroup {
  if (code === 0) return 'clear'
  if (code >= 1 && code <= 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'thunder'
  return 'cloudy'
}

// A workout scheduled outdoors (treated here as the "cardio" category) is
// worth flagging when it's rainy/snowy/stormy, rain is likely, or it's cold.
export function isBadForOutdoorTraining(weather: DailyWeather): boolean {
  const group = weatherCodeToGroup(weather.weatherCode)
  const isWet = group === 'rain' || group === 'snow' || group === 'thunder'
  return isWet || weather.precipitationProbabilityMax >= 50 || weather.highC < 10
}
