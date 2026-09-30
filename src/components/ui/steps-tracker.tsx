import { Link } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, TextInput, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { InfoToggle } from '@/components/ui/info-toggle'
import { MiniLineChart } from '@/components/ui/mini-line-chart'
import { digitsOnly } from '@/lib/digits-only'
import { formatDayLabel, getLastNDays } from '@/lib/last-days'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'

const DAYS = 4

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function StepsTracker({ className }: { className?: string }) {
  const { t } = useTranslation()
  const profile = useAuthStore(state => state.profile)
  const [byDate, setByDate] = useState<Record<string, number>>({})
  const [todayInput, setTodayInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    if (!profile) return
    const days = getLastNDays(DAYS)

    const { data } = await supabase
      .from('step_logs')
      .select('date, steps')
      .eq('client_id', profile.id)
      .gte('date', days[0])

    const map: Record<string, number> = {}
    for (const row of data ?? []) map[row.date] = row.steps
    setByDate(map)
    setTodayInput(map[todayIso()] != null ? String(map[todayIso()]) : '')
  }, [profile])

  useEffect(() => {
    load()
  }, [load])

  const saveToday = async () => {
    if (!profile) return
    const value = Math.round(Number(todayInput))
    if (!todayInput || Number.isNaN(value)) return

    setIsSaving(true)
    await supabase.from('step_logs').upsert({ client_id: profile.id, date: todayIso(), steps: value }, { onConflict: 'client_id,date' })
    setIsSaving(false)

    setByDate(prev => ({ ...prev, [todayIso()]: value }))
  }

  const days = getLastNDays(DAYS)
  const chartData = days.map(date => ({ label: formatDayLabel(date), value: byDate[date] ?? null }))
  const todaySteps = byDate[todayIso()]

  return (
    <View className={className}>
      <View className="mb-1 flex-row items-center gap-1.5">
        <Text className="font-display-medium text-[11px] uppercase tracking-[2px] text-gold">
          {t('home.steps.title')}
        </Text>
        <InfoToggle text={t('glossary.steps')} />
      </View>
      <Text className="mb-3 font-display-bold text-2xl text-ivory">
        {todaySteps != null ? todaySteps.toLocaleString() : '—'}
        <Text className="font-sans text-sm text-muted"> {t('home.steps.today')}</Text>
      </Text>

      <MiniLineChart data={chartData} emptyLabel={t('home.weight.noData')} />

      <View className="mt-4">
        <TextInput
          value={todayInput}
          onChangeText={v => setTodayInput(digitsOnly(v))}
          keyboardType="number-pad"
          placeholder={t('home.steps.placeholder')}
          className="rounded-md border border-border bg-graph px-3 py-2 text-base text-ivory"
        />
      </View>

      <Button label={t('home.steps.saveButton')} variant="ghost" onPress={saveToday} isLoading={isSaving} className="mt-3 py-2.5" />

      <Link href="/(client)/steps-history" asChild>
        <Pressable className="mt-3 items-center active:opacity-60">
          <Text className="font-sans-medium text-xs text-gold">{t('history.link')} →</Text>
        </Pressable>
      </Link>
    </View>
  )
}
