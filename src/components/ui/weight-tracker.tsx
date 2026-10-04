import { Link } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, TextInput, View } from 'react-native'

import { Confetti } from '@/components/ui/confetti'
import { InfoToggle } from '@/components/ui/info-toggle'
import { MiniLineChart } from '@/components/ui/mini-line-chart'
import { SaveStatus, type SaveState } from '@/components/ui/save-status'
import { bmiCategory, calculateBmi } from '@/lib/bmi'
import { decimalDigitsOnly } from '@/lib/digits-only'
import { formatDayLabel, getLastNDays } from '@/lib/last-days'
import { supabase } from '@/lib/supabase'
import { isWeightImprovement } from '@/lib/tracker-insights'
import { useAuthStore } from '@/stores/auth-store'

const DAYS = 4
const SAVE_DELAY_MS = 700

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function WeightTracker({ className }: { className?: string }) {
  const { t } = useTranslation()
  const profile = useAuthStore(state => state.profile)
  const [byDate, setByDate] = useState<Record<string, number>>({})
  const [todayInput, setTodayInput] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [celebration, setCelebration] = useState<{ trigger: number; comment: string } | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const celebrationCountRef = useRef(0)

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

  useEffect(() => () => (saveTimeoutRef.current ? clearTimeout(saveTimeoutRef.current) : undefined), [])

  const commitSave = async (raw: string) => {
    if (!profile) return
    const value = Number(raw.replace(',', '.'))
    if (!raw || Number.isNaN(value)) return

    const today = todayIso()
    const previousWeight = getLastNDays(DAYS)
      .filter(d => d !== today)
      .reverse()
      .map(d => byDate[d])
      .find((v): v is number => v != null)

    setSaveState('saving')
    await supabase
      .from('weight_logs')
      .upsert({ client_id: profile.id, date: today, weight_kg: value }, { onConflict: 'client_id,date' })
    setByDate(prev => ({ ...prev, [today]: value }))
    setSaveState('saved')
    setTimeout(() => setSaveState(s => (s === 'saved' ? 'idle' : s)), 1500)

    if (isWeightImprovement(previousWeight ?? null, value, profile.fitness_goal)) {
      const delta = Math.abs(value - (previousWeight ?? value)).toFixed(1)
      const wantsUp = profile.fitness_goal === 'gain_muscle'
      celebrationCountRef.current += 1
      setCelebration({
        trigger: celebrationCountRef.current,
        comment: t(wantsUp ? 'home.weight.improvementCommentUp' : 'home.weight.improvementCommentDown', { amount: delta }),
      })
      setTimeout(() => setCelebration(null), 4000)
    }
  }

  const handleChangeText = (raw: string) => {
    const cleaned = decimalDigitsOnly(raw)
    setTodayInput(cleaned)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => commitSave(cleaned), SAVE_DELAY_MS)
  }

  const handleBlur = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    commitSave(todayInput)
  }

  const days = getLastNDays(DAYS)
  const chartData = days.map(date => ({ label: formatDayLabel(date), value: byDate[date] ?? null }))

  const latestWeight = days
    .slice()
    .reverse()
    .map(date => byDate[date])
    .find((value): value is number => value != null)
  const heightCm = profile?.height_cm ?? null
  const bmi = latestWeight != null && heightCm ? calculateBmi(latestWeight, heightCm) : null
  const category = bmi != null ? bmiCategory(bmi) : null

  return (
    <View className={`relative ${className ?? ''}`}>
      {celebration ? <Confetti trigger={celebration.trigger} /> : null}

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
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          keyboardType="decimal-pad"
          placeholder={t('home.weight.placeholder')}
          className="min-w-0 flex-1 rounded-md border border-border bg-graph px-3 py-2 text-base text-ivory"
        />
        <Text className="text-sm text-muted">kg</Text>
      </View>

      <SaveStatus state={saveState} className="mt-2" />

      {celebration ? (
        <View className="mt-2 rounded-md border border-good/30 bg-good/10 px-2.5 py-2">
          <Text className="text-xs leading-4 text-good">{celebration.comment}</Text>
        </View>
      ) : null}

      {bmi != null && category ? (
        <View className="mt-3 rounded-md border border-border bg-coal p-2.5">
          <View className="flex-row items-baseline justify-between">
            <Text className="font-display-medium text-[10px] uppercase tracking-[1px] text-muted">BMI</Text>
            <Text className={`font-display-bold text-base ${category === 'normal' ? 'text-good' : 'text-gold'}`}>
              {bmi.toFixed(1)}
            </Text>
          </View>
          <Text className="mt-1 text-xs leading-4 text-muted">{t(`home.weight.bmiComments.${category}`)}</Text>
        </View>
      ) : latestWeight != null ? (
        <Link href="/(client)/profile" asChild>
          <Pressable className="mt-3 rounded-md border border-border bg-coal p-2.5 active:opacity-70">
            <Text className="text-xs text-muted">{t('home.weight.bmiMissingHeight')}</Text>
          </Pressable>
        </Link>
      ) : null}

      <Link href="/(client)/weight-history" asChild>
        <Pressable className="mt-3 items-center active:opacity-60">
          <Text className="font-sans-medium text-xs text-gold">{t('history.link')} →</Text>
        </Pressable>
      </Link>
    </View>
  )
}
