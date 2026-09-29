import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, View } from 'react-native'

import { InfoToggle } from '@/components/ui/info-toggle'
import { MiniLineChart } from '@/components/ui/mini-line-chart'
import { addDaysIso, formatDayLabel, getLastNDays, todayIso } from '@/lib/last-days'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { WaterIntake } from '@/types/database'

const STEP_LITERS = 0.25
const BAR_HEIGHT = 140
const DAYS = 4
const DEFAULT_GOAL = 3

function formatLiters(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, '')
}

export function WaterTracker({ className }: { className?: string }) {
  const { t } = useTranslation()
  const profile = useAuthStore(state => state.profile)
  const [byDate, setByDate] = useState<Record<string, WaterIntake | null>>({})
  const [selectedDate, setSelectedDate] = useState(todayIso())
  const [isLoading, setIsLoading] = useState(true)

  const loadRecentDays = useCallback(async () => {
    if (!profile) return
    const days = getLastNDays(DAYS)

    const { data } = await supabase
      .from('water_intake')
      .select('*')
      .eq('client_id', profile.id)
      .gte('date', days[0])

    setByDate(prev => {
      const next = { ...prev }
      for (const date of days) next[date] = null
      for (const row of (data ?? []) as WaterIntake[]) next[row.date] = row
      return next
    })
    setIsLoading(false)
  }, [profile])

  useEffect(() => {
    loadRecentDays()
  }, [loadRecentDays])

  // Fetch a single date on demand when navigating further than the 4-day
  // window already loaded for the chart.
  useEffect(() => {
    if (!profile || selectedDate in byDate) return

    supabase
      .from('water_intake')
      .select('*')
      .eq('client_id', profile.id)
      .eq('date', selectedDate)
      .maybeSingle()
      .then(({ data }) => {
        setByDate(prev => ({ ...prev, [selectedDate]: (data as WaterIntake) ?? null }))
      })
  }, [profile, selectedDate, byDate])

  const selectedEntry = byDate[selectedDate]
  const liters = selectedEntry?.liters ?? 0
  const goal = selectedEntry?.goal_liters ?? DEFAULT_GOAL

  const updateLiters = async (next: number) => {
    if (!profile) return
    const clamped = Math.max(0, Math.round(next * 100) / 100)

    setByDate(prev => ({
      ...prev,
      [selectedDate]: { ...(prev[selectedDate] ?? { id: '', client_id: profile.id, date: selectedDate, goal_liters: goal }), liters: clamped },
    }))

    await supabase
      .from('water_intake')
      .upsert(
        { client_id: profile.id, date: selectedDate, liters: clamped, goal_liters: goal },
        { onConflict: 'client_id,date' }
      )
  }

  const percent = Math.min(100, Math.round((liters / goal) * 100))
  const days = getLastNDays(DAYS)
  const chartData = days.map(date => ({ label: formatDayLabel(date), value: byDate[date]?.liters ?? null }))
  const isToday = selectedDate === todayIso()

  return (
    <View className={className}>
      <View className="mb-1 flex-row items-center gap-1.5">
        <Text className="font-display-medium text-[11px] uppercase tracking-[2px] text-gold">
          {t('home.water.title')}
        </Text>
        <InfoToggle text={t('glossary.water')} />
      </View>
      <View className="mb-1 flex-row items-center justify-between">
        <Pressable onPress={() => setSelectedDate(prev => addDaysIso(prev, -1))} hitSlop={14} className="active:opacity-60">
          <Ionicons name="chevron-back" size={16} color="#948C7D" />
        </Pressable>
        <Text className="text-center text-xs text-muted">
          {isToday ? t('home.bloodPressure.today') : formatDayLabel(selectedDate)}
        </Text>
        <Pressable onPress={() => setSelectedDate(prev => addDaysIso(prev, 1))} hitSlop={14} className="active:opacity-60">
          <Ionicons name="chevron-forward" size={16} color="#948C7D" />
        </Pressable>
      </View>

      <Text className="mb-4 font-display-bold text-lg text-ivory">
        {formatLiters(liters)} L <Text className="text-muted">| {formatLiters(goal)} L</Text>
      </Text>

      <View className="flex-row items-center gap-4">
        <View style={{ height: BAR_HEIGHT }} className="w-6 justify-end overflow-hidden rounded-full bg-graph">
          <View
            style={{ height: `${percent}%` }}
            className={`w-full rounded-full ${isLoading ? 'opacity-0' : 'bg-gold'}`}
          />
        </View>

        <View style={{ height: BAR_HEIGHT }} className="justify-between py-1">
          <Text className="text-xs text-muted">100%</Text>
          <Text className="text-xs text-muted">50%</Text>
          <Text className="text-xs text-muted">0%</Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center gap-3">
        <Pressable
          onPress={() => updateLiters(liters - STEP_LITERS)}
          disabled={isLoading}
          className="h-11 w-11 items-center justify-center rounded-full border border-border bg-graph active:opacity-70"
        >
          <Text className="text-xl text-ivory">−</Text>
        </Pressable>

        <View className="flex-1 items-center rounded-md border border-border bg-graph py-2.5">
          <Text className="font-display text-base text-ivory">{formatLiters(liters)}</Text>
        </View>

        <Pressable
          onPress={() => updateLiters(liters + STEP_LITERS)}
          disabled={isLoading}
          className="h-11 w-11 items-center justify-center rounded-full border border-gold bg-gold active:opacity-70"
        >
          <Text className="text-xl text-coal">+</Text>
        </Pressable>
      </View>

      <Text className="mb-1 mt-6 font-display-medium text-[10px] uppercase tracking-[1px] text-muted">
        {t('home.water.history')}
      </Text>
      <MiniLineChart data={chartData} emptyLabel={t('home.bloodPressure.noData')} />
    </View>
  )
}
