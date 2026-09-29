import { Ionicons } from '@expo/vector-icons'
import { Link, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'

import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { toDateLocale } from '@/lib/date-locale'
import { addMonths, getMonthGrid } from '@/lib/month-grid'
import { pickTranslation } from '@/lib/pick-translation'
import { todayIso } from '@/lib/last-days'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguageStore } from '@/stores/language-store'
import type { Workout } from '@/types/database'

type WorkoutRow = Workout & { displayTitle: string }

export default function CalendarScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const language = useLanguageStore(state => state.language)
  const profile = useAuthStore(state => state.profile)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [mode, setMode] = useState<'month' | 'list'>('month')
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadMonth = useCallback(async () => {
    if (!profile) return
    setIsLoading(true)

    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`

    const { data } = await supabase
      .from('workouts')
      .select('*, workout_translations(language_code, title)')
      .eq('client_id', profile.id)
      .gte('scheduled_date', start)
      .lte('scheduled_date', end)
      .order('scheduled_date', { ascending: true })

    const rows: WorkoutRow[] = (data ?? []).map(row => {
      const translations = (row.workout_translations ?? []) as { language_code: string; title: string }[]
      return { ...row, displayTitle: pickTranslation(translations, language)?.title ?? row.title }
    })
    setWorkouts(rows)
    setIsLoading(false)
  }, [profile, year, month, language])

  useEffect(() => {
    loadMonth()
  }, [loadMonth])

  const workoutsByDate = useMemo(() => {
    const map = new Map<string, WorkoutRow[]>()
    for (const w of workouts) {
      if (!w.scheduled_date) continue
      const list = map.get(w.scheduled_date) ?? []
      list.push(w)
      map.set(w.scheduled_date, list)
    }
    return map
  }, [workouts])

  const weeks = useMemo(() => getMonthGrid(year, month), [year, month])
  const weekdayLabels = t('calendar.weekdays', { returnObjects: true }) as string[]
  const monthLabel = new Date(year, month, 1).toLocaleDateString(toDateLocale(language), { month: 'long', year: 'numeric' })
  const today = todayIso()

  const goToMonth = (delta: number) => {
    const next = addMonths(year, month, delta)
    setYear(next.year)
    setMonth(next.month)
  }

  const handleDayPress = (iso: string) => {
    const dayWorkouts = workoutsByDate.get(iso)
    if (dayWorkouts?.length) {
      router.push({ pathname: '/(client)/workout/[id]', params: { id: dayWorkouts[0].id } })
    }
  }

  return (
    <ScrollView className="flex-1 bg-coal" contentContainerClassName="px-5 pb-10 pt-16">
      <Heading underline className="mb-6">
        {t('calendar.title')}
      </Heading>

      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => goToMonth(-1)} hitSlop={10} className="h-9 w-9 items-center justify-center rounded-full bg-graph active:opacity-70">
            <Ionicons name="chevron-back" size={18} color="#D2A85E" />
          </Pressable>
          <Text className="w-32 text-center font-display-medium text-sm capitalize text-ivory">{monthLabel}</Text>
          <Pressable onPress={() => goToMonth(1)} hitSlop={10} className="h-9 w-9 items-center justify-center rounded-full bg-graph active:opacity-70">
            <Ionicons name="chevron-forward" size={18} color="#D2A85E" />
          </Pressable>
        </View>

        <View className="flex-row overflow-hidden rounded-full border border-border">
          <Pressable
            onPress={() => setMode('month')}
            className={`min-h-9 justify-center px-3 py-1.5 active:opacity-80 ${mode === 'month' ? 'bg-gold' : 'bg-graph'}`}
          >
            <Text className={`font-sans-medium text-xs ${mode === 'month' ? 'text-coal' : 'text-muted'}`}>
              {t('calendar.monthView')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('list')}
            className={`min-h-9 justify-center px-3 py-1.5 active:opacity-80 ${mode === 'list' ? 'bg-gold' : 'bg-graph'}`}
          >
            <Text className={`font-sans-medium text-xs ${mode === 'list' ? 'text-coal' : 'text-muted'}`}>
              {t('calendar.listView')}
            </Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#D2A85E" className="mt-6" />
      ) : mode === 'month' ? (
        <View className="overflow-hidden rounded-md border border-border">
          <View className="flex-row bg-graph">
            {weekdayLabels.map(label => (
              <View key={label} className="flex-1 items-center py-2">
                <Text className="font-sans-medium text-[11px] uppercase text-muted">{label}</Text>
              </View>
            ))}
          </View>
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} className="flex-row border-t border-border">
              {week.map((cell, dayIndex) => {
                const borderClass = dayIndex > 0 ? 'border-l border-border' : ''
                if (!cell) return <View key={dayIndex} className={`min-h-16 flex-1 ${borderClass}`} />
                const hasWorkout = workoutsByDate.has(cell.iso)
                const isToday = cell.iso === today
                return (
                  <Pressable
                    key={dayIndex}
                    onPress={() => handleDayPress(cell.iso)}
                    disabled={!hasWorkout}
                    className={`min-h-16 flex-1 items-center py-2 active:opacity-70 ${borderClass} ${
                      isToday ? 'bg-gold/15' : ''
                    }`}
                  >
                    <Text className={`text-sm ${isToday ? 'font-display-medium text-gold' : 'text-ivory'}`}>{cell.day}</Text>
                    {hasWorkout ? <View className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold" /> : null}
                  </Pressable>
                )
              })}
            </View>
          ))}
        </View>
      ) : workouts.length ? (
        <View className="gap-3">
          {workouts.map(item => (
            <Link key={item.id} href={{ pathname: '/(client)/workout/[id]', params: { id: item.id } }} asChild>
              <Card>
                <Text className="font-display-medium text-xs uppercase tracking-[2px] text-muted">
                  {item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString(toDateLocale(language)) : ''}
                </Text>
                <Text className="mt-2 font-display text-lg text-ivory">{item.displayTitle}</Text>
              </Card>
            </Link>
          ))}
        </View>
      ) : (
        <Text className="mt-4 text-muted">{t('calendar.empty')}</Text>
      )}
    </ScrollView>
  )
}
