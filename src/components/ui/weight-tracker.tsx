import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, TextInput, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { InfoToggle } from '@/components/ui/info-toggle'
import { MiniLineChart } from '@/components/ui/mini-line-chart'
import { decimalDigitsOnly } from '@/lib/digits-only'
import { formatDayLabel, getLastNDays } from '@/lib/last-days'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'

const DAYS = 4

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function WeightTracker({ className }: { className?: string }) {
  const { t } = useTranslation()
  const profile = useAuthStore(state => state.profile)
  const [byDate, setByDate] = useState<Record<string, number>>({})
  const [todayInput, setTodayInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    if (!profile) return
    const days = getLastNDays(DAYS)

    const { data } = await supabase
      .from('weight_logs')
      .select('date, weight_kg')
      .eq('client_id', profile.id)
      .gte('date', days[0])

    const map: Record<string, number> = {}
    for (const row of data ?? []) map[row.date] = row.weight_kg
    setByDate(map)
    setTodayInput(map[todayIso()] != null ? String(map[todayIso()]) : '')
  }, [profile])

  useEffect(() => {
    load()
  }, [load])

  const saveToday = async () => {
    if (!profile) return
    const value = Number(todayInput.replace(',', '.'))
    if (!todayInput || Number.isNaN(value)) return

    setIsSaving(true)
    await supabase
      .from('weight_logs')
      .upsert({ client_id: profile.id, date: todayIso(), weight_kg: value }, { onConflict: 'client_id,date' })
    setIsSaving(false)

    setByDate(prev => ({ ...prev, [todayIso()]: value }))
  }

  const days = getLastNDays(DAYS)
  const chartData = days.map(date => ({ label: formatDayLabel(date), value: byDate[date] ?? null }))

  return (
    <View className={className}>
      <View className="mb-3 flex-row items-center gap-1.5">
        <Text className="font-display-medium text-[11px] uppercase tracking-[2px] text-gold">
          {t('home.weight.title')}
        </Text>
        <InfoToggle text={t('glossary.weight')} />
      </View>

      <MiniLineChart data={chartData} emptyLabel={t('home.weight.noData')} />

      <View className="mt-4 flex-row items-center gap-2">
        <TextInput
          value={todayInput}
          onChangeText={v => setTodayInput(decimalDigitsOnly(v))}
          keyboardType="decimal-pad"
          placeholder={t('home.weight.placeholder')}
          className="min-w-0 flex-1 rounded-md border border-border bg-graph px-3 py-2 text-base text-ivory"
        />
        <Text className="text-sm text-muted">kg</Text>
      </View>

      <Button label={t('home.weight.saveButton')} variant="ghost" onPress={saveToday} isLoading={isSaving} className="mt-3 py-2.5" />
    </View>
  )
}
