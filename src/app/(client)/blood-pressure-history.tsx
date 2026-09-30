import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'

import { Heading } from '@/components/ui/heading'
import { MiniLineChart } from '@/components/ui/mini-line-chart'
import { formatDayLabel, getLastNDays } from '@/lib/last-days'
import { supabase } from '@/lib/supabase'
import { bloodPressureCategory } from '@/lib/tracker-insights'
import { useAuthStore } from '@/stores/auth-store'

const HISTORY_DAYS = 30
const LABEL_STEP = 5

type Entry = { date: string; systolic: number; diastolic: number; pulse: number | null }

export default function BloodPressureHistoryScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const profile = useAuthStore(state => state.profile)
  const [entries, setEntries] = useState<Entry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const days = getLastNDays(HISTORY_DAYS)

    supabase
      .from('blood_pressure_logs')
      .select('date, systolic, diastolic, pulse')
      .eq('client_id', profile.id)
      .gte('date', days[0])
      .order('date', { ascending: true })
      .then(({ data }) => {
        setEntries(data ?? [])
        setIsLoading(false)
      })
  }, [profile])

  const days = getLastNDays(HISTORY_DAYS)
  const byDate = Object.fromEntries(entries.map(e => [e.date, e.systolic]))
  const chartData = days.map((date, i) => ({ label: i % LABEL_STEP === 0 ? formatDayLabel(date) : '', value: byDate[date] ?? null }))

  const latest = entries[entries.length - 1] ?? null
  const category = bloodPressureCategory(latest?.systolic ?? null, latest?.diastolic ?? null)

  return (
    <ScrollView className="flex-1 bg-coal" contentContainerClassName="px-5 pb-10 pt-16">
      <Pressable onPress={() => router.back()} hitSlop={12} className="mb-4 flex-row items-center gap-1.5 self-start active:opacity-60">
        <Ionicons name="chevron-back" size={16} color="#D2A85E" />
        <Text className="font-sans-medium text-sm text-gold">{t('history.back')}</Text>
      </Pressable>

      <Heading underline className="mb-6">
        {t('history.bloodPressure.title')}
      </Heading>

      {isLoading ? (
        <ActivityIndicator color="#D2A85E" />
      ) : (
        <>
          <View className="mb-6 rounded-md border border-gold/30 bg-gold/10 p-3">
            <Text className="text-sm leading-5 text-ivory">{t(`history.bloodPressure.comments.${category}`)}</Text>
          </View>

          <Text className="mb-1 font-display-medium text-[10px] uppercase tracking-[1px] text-muted">Systolic</Text>
          <MiniLineChart data={chartData} emptyLabel={t('home.bloodPressure.noData')} />

          <Text className="mb-2 mt-8 font-display-medium text-xs uppercase tracking-[1px] text-muted">
            {t('history.entriesLabel')}
          </Text>
          {entries.length === 0 ? (
            <Text className="text-muted">{t('home.bloodPressure.noData')}</Text>
          ) : (
            [...entries].reverse().map(entry => (
              <View key={entry.date} className="flex-row items-center justify-between border-b border-border-soft py-2.5">
                <Text className="text-sm text-muted">{formatDayLabel(entry.date)}</Text>
                <Text className="font-display text-sm text-ivory">
                  {entry.systolic}/{entry.diastolic} {t('home.bloodPressure.unit')}
                  {entry.pulse != null ? ` · ${entry.pulse} bpm` : ''}
                </Text>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  )
}
