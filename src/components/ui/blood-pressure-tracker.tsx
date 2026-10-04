import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, TextInput, View } from 'react-native'

import { Confetti } from '@/components/ui/confetti'
import { MiniLineChart } from '@/components/ui/mini-line-chart'
import { SaveStatus, type SaveState } from '@/components/ui/save-status'
import { useThemeColors } from '@/hooks/use-theme-colors'
import { digitsOnly } from '@/lib/digits-only'
import { addDaysIso, formatDayLabel, getLastNDays, todayIso } from '@/lib/last-days'
import { supabase } from '@/lib/supabase'
import { isBloodPressureImprovement } from '@/lib/tracker-insights'
import { useAuthStore } from '@/stores/auth-store'
import type { BloodPressureLog } from '@/types/database'

const DAYS = 4
const SAVE_DELAY_MS = 700

export function BloodPressureTracker({ className }: { className?: string }) {
  const { t } = useTranslation()
  const theme = useThemeColors()
  const profile = useAuthStore(state => state.profile)
  const [byDate, setByDate] = useState<Record<string, BloodPressureLog | null>>({})
  const [selectedDate, setSelectedDate] = useState(todayIso())
  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [pulse, setPulse] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [openInfo, setOpenInfo] = useState<'systolic' | 'diastolic' | 'pulse' | null>(null)
  const [celebration, setCelebration] = useState<{ trigger: number; comment: string } | null>(null)

  const systolicRef = useRef('')
  const diastolicRef = useRef('')
  const pulseRef = useRef('')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const celebrationCountRef = useRef(0)

  const loadRecentDays = useCallback(async () => {
    if (!profile) return
    const days = getLastNDays(DAYS)

    const { data } = await supabase
      .from('blood_pressure_logs')
      .select('*')
      .eq('client_id', profile.id)
      .gte('date', days[0])

    setByDate(prev => {
      const next = { ...prev }
      for (const date of days) next[date] = null
      for (const row of (data ?? []) as BloodPressureLog[]) next[row.date] = row
      return next
    })
  }, [profile])

  useEffect(() => {
    loadRecentDays()
  }, [loadRecentDays])

  // Fetch a single date on demand when navigating further back than the
  // 4-day window we already loaded for the chart.
  useEffect(() => {
    if (!profile || selectedDate in byDate) return

    supabase
      .from('blood_pressure_logs')
      .select('*')
      .eq('client_id', profile.id)
      .eq('date', selectedDate)
      .maybeSingle()
      .then(({ data }) => {
        setByDate(prev => ({ ...prev, [selectedDate]: (data as BloodPressureLog) ?? null }))
      })
  }, [profile, selectedDate, byDate])

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    const entry = byDate[selectedDate]
    const sys = entry ? String(entry.systolic) : ''
    const dia = entry ? String(entry.diastolic) : ''
    const pul = entry?.pulse != null ? String(entry.pulse) : ''
    setSystolic(sys)
    setDiastolic(dia)
    setPulse(pul)
    systolicRef.current = sys
    diastolicRef.current = dia
    pulseRef.current = pul
  }, [selectedDate, byDate])

  useEffect(() => () => (saveTimeoutRef.current ? clearTimeout(saveTimeoutRef.current) : undefined), [])

  const commitSave = async () => {
    if (!profile) return
    const sys = Math.round(Number(systolicRef.current))
    const dia = Math.round(Number(diastolicRef.current))
    if (!systolicRef.current || !diastolicRef.current || Number.isNaN(sys) || Number.isNaN(dia)) return

    const pulseValue = pulseRef.current ? Math.round(Number(pulseRef.current)) : null
    const date = selectedDate

    const previousSystolic = getLastNDays(DAYS)
      .filter(d => d !== date)
      .reverse()
      .map(d => byDate[d]?.systolic)
      .find((v): v is number => v != null)

    setSaveState('saving')
    const { data } = await supabase
      .from('blood_pressure_logs')
      .upsert({ client_id: profile.id, date, systolic: sys, diastolic: dia, pulse: pulseValue }, { onConflict: 'client_id,date' })
      .select()
      .single()

    if (data) setByDate(prev => ({ ...prev, [date]: data as BloodPressureLog }))
    setSaveState('saved')
    setTimeout(() => setSaveState(s => (s === 'saved' ? 'idle' : s)), 1500)

    if (isBloodPressureImprovement(previousSystolic ?? null, sys)) {
      celebrationCountRef.current += 1
      setCelebration({ trigger: celebrationCountRef.current, comment: t('home.bloodPressure.improvementComment') })
      setTimeout(() => setCelebration(null), 4000)
    }
  }

  const scheduleSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(commitSave, SAVE_DELAY_MS)
  }

  const handleBlur = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    commitSave()
  }

  const days = getLastNDays(DAYS)
  const chartData = days.map(date => ({ label: formatDayLabel(date), value: byDate[date]?.systolic ?? null }))
  const selectedEntry = byDate[selectedDate]
  const isToday = selectedDate === todayIso()

  return (
    <View className={`relative ${className ?? ''}`}>
      {celebration ? <Confetti trigger={celebration.trigger} /> : null}

      <Text className="mb-1 font-display-medium text-[11px] uppercase tracking-[2px] text-gold">
        {t('home.bloodPressure.title')}
      </Text>
      <View className="mb-1 flex-row items-center justify-between">
        <Pressable onPress={() => setSelectedDate(prev => addDaysIso(prev, -1))} hitSlop={14} className="active:opacity-60">
          <Ionicons name="chevron-back" size={16} color={theme.muted} />
        </Pressable>
        <Text className="text-center text-xs text-muted">
          {isToday ? t('home.bloodPressure.today') : formatDayLabel(selectedDate)}
        </Text>
        <Pressable onPress={() => setSelectedDate(prev => addDaysIso(prev, 1))} disabled={isToday} hitSlop={14} className="active:opacity-60">
          <Ionicons name="chevron-forward" size={16} color={isToday ? theme.mutedSoft : theme.muted} />
        </Pressable>
      </View>

      <Text className="mb-3 font-display-bold text-2xl text-ivory">
        {selectedEntry ? `${selectedEntry.systolic}/${selectedEntry.diastolic}` : '—'}
        <Text className="font-sans text-sm text-muted"> {t('home.bloodPressure.unit')}</Text>
        {selectedEntry?.pulse != null ? (
          <Text className="font-sans text-sm text-muted">  ·  {selectedEntry.pulse} bpm</Text>
        ) : null}
      </Text>

      <MiniLineChart data={chartData} emptyLabel={t('home.bloodPressure.noData')} />

      <View className="mt-4 flex-row gap-2">
        <View className="min-w-0 flex-1">
          <TextInput
            value={systolic}
            onChangeText={v => {
              const cleaned = digitsOnly(v)
              setSystolic(cleaned)
              systolicRef.current = cleaned
              scheduleSave()
            }}
            onBlur={handleBlur}
            keyboardType="number-pad"
            placeholder={t('home.bloodPressure.systolicPlaceholder')}
            className="rounded-md border border-border bg-graph px-3 py-2 text-base text-ivory"
          />
          <Pressable
            onPress={() => setOpenInfo(prev => (prev === 'systolic' ? null : 'systolic'))}
            hitSlop={14}
            className="mt-1.5 items-center active:opacity-60"
          >
            <Ionicons
              name={openInfo === 'systolic' ? 'information-circle' : 'information-circle-outline'}
              size={14}
              color={theme.muted}
            />
          </Pressable>
        </View>

        <View className="min-w-0 flex-1">
          <TextInput
            value={diastolic}
            onChangeText={v => {
              const cleaned = digitsOnly(v)
              setDiastolic(cleaned)
              diastolicRef.current = cleaned
              scheduleSave()
            }}
            onBlur={handleBlur}
            keyboardType="number-pad"
            placeholder={t('home.bloodPressure.diastolicPlaceholder')}
            className="rounded-md border border-border bg-graph px-3 py-2 text-base text-ivory"
          />
          <Pressable
            onPress={() => setOpenInfo(prev => (prev === 'diastolic' ? null : 'diastolic'))}
            hitSlop={14}
            className="mt-1.5 items-center active:opacity-60"
          >
            <Ionicons
              name={openInfo === 'diastolic' ? 'information-circle' : 'information-circle-outline'}
              size={14}
              color={theme.muted}
            />
          </Pressable>
        </View>

        <View className="min-w-0 flex-1">
          <TextInput
            value={pulse}
            onChangeText={v => {
              const cleaned = digitsOnly(v)
              setPulse(cleaned)
              pulseRef.current = cleaned
              scheduleSave()
            }}
            onBlur={handleBlur}
            keyboardType="number-pad"
            placeholder={t('home.bloodPressure.pulsePlaceholder')}
            className="rounded-md border border-border bg-graph px-3 py-2 text-base text-ivory"
          />
          <Pressable
            onPress={() => setOpenInfo(prev => (prev === 'pulse' ? null : 'pulse'))}
            hitSlop={14}
            className="mt-1.5 items-center active:opacity-60"
          >
            <Ionicons
              name={openInfo === 'pulse' ? 'information-circle' : 'information-circle-outline'}
              size={14}
              color={theme.muted}
            />
          </Pressable>
        </View>
      </View>

      {openInfo ? (
        <View className="mt-2 rounded-md border border-border bg-graph p-3">
          <Text className="text-[11px] leading-4 text-muted">{t(`glossary.${openInfo}`)}</Text>
        </View>
      ) : null}

      {!systolic || !diastolic ? (
        <Text className="mt-2 text-[11px] text-muted">{t('home.bloodPressure.hint')}</Text>
      ) : (
        <SaveStatus state={saveState} className="mt-2" />
      )}

      {celebration ? (
        <View className="mt-2 rounded-md border border-good/30 bg-good/10 px-2.5 py-2">
          <Text className="text-xs leading-4 text-good">{celebration.comment}</Text>
        </View>
      ) : null}

      <Link href="/(client)/blood-pressure-history" asChild>
        <Pressable className="mt-3 items-center active:opacity-60">
          <Text className="font-sans-medium text-xs text-gold">{t('history.link')} →</Text>
        </Pressable>
      </Link>
    </View>
  )
}
