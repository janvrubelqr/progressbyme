// Best-effort current weather lookup (no API key — Open-Meteo is free and
// CORS-friendly for direct client calls). Used to add the climate
// correction from knowledge-base/hydration-guidelines.md to the water goal.

export type CurrentWeather = { temperatureC: number; humidityPct: number }

export async function fetchCurrentWeather(latitude: number, longitude: number): Promise<CurrentWeather | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m`
    const response = await fetch(url)
    if (!response.ok) return null

    const data = await response.json()
    const temperatureC = data?.current?.temperature_2m
    const humidityPct = data?.current?.relative_humidity_2m
    if (typeof temperatureC !== 'number' || typeof humidityPct !== 'number') return null

    return { temperatureC, humidityPct }
  } catch {
    return null
  }
}
