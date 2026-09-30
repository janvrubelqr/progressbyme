import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, TextInput, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { MiniLineChart } from '@/components/ui/mini-line-chart'
import { digitsOnly } from '@/lib/digits-only'
import { addDaysIso, formatDayLabel, getLastNDays, todayIso } from '@/lib/last-days'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { BloodPressureLog } from '@/types/database'

const DAYS = 4

export function BloodPressureTracker({ className }: { className?: string }) {
  const { t } = useTranslation()
  const profile = useAuthStore(state => state.profile)
  const [byDate, setByDate] = useState<Record<string, BloodPressureLog | null>>({})
  const [selectedDate, setSelectedDate] = useState(todayIso())
  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [pulse, setPulse] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [validationError, setValidationError] = useState(false)
  const [openInfo, setOpenInfo] = useState<'systolic' | 'diastolic' | 'pulse' | null>(null)

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
    const entry = byDate[selectedDate]
    setSystolic(entry ? String(entry.systolic) : '')
    setDiastolic(entry ? String(entry.diastolic) : '')
    setPulse(entry?.pulse != null ? String(entry.pulse) : '')
  }, [selectedDate, byDate])

  const saveSelectedDate = async () => {
    if (!profile) return
    const sys = Math.round(Number(systolic))
    const dia = Math.round(Number(diastolic))
    if (!systolic || !diastolic || Number.isNaN(sys) || Number.isNaN(dia)) return false

    const pulseValue = pulse ? Math.round(Number(pulse)) : null

    const { data } = await supabase
      .from('blood_pressure_logs')
      .upsert(
        { client_id: profile.id, date: selectedDate, systolic: sys, diastolic: dia, pulse: pulseValue },
        { onConflict: 'client_id,date' }
      )
      .select()
      .single()

    if (data) {
      setByDate(prev => ({ ...prev, [selectedDate]: data as BloodPressureLog }))
      return true
    }
    return false
  }

  const handleAddPress = async () => {
    if (!systolic || !diastolic) {
      setValidationError(true)
      return
    }
    setValidationError(false)
    setIsSaving(true)
    await saveSelectedDate()
    setIsSaving(false)
  }

  const days = getLastNDays(DAYS)
  const chartData = days.map(date => ({ label: formatDayLabel(date), value: byDate[date]?.systolic ?? null }))
  const selectedEntry = byDate[selectedDate]
  const isToday = selectedDate === todayIso()

  return (
    <View className={className}>
      <Text className="mb-1 font-display-medium text-[11px] uppercase tracking-[2px] text-gold">
        {t('home.bloodPressure.title')}
      </Text>
      <View className="mb-1 flex-row items-center justify-between">
        <Pressable onPress={() => setSelectedDate(prev => addDaysIso(prev, -1))} hitSlop={14} className="active:opacity-60">
          <Ionicons name="chevron-back" size={16} color="#948C7D" />
        </Pressable>
        <Text className="text-center text-xs text-muted">
          {isToday ? t('home.bloodPressure.today') : formatDayLabel(selectedDate)}
        </Text>
        <Pressable onPress={() => setSelectedDate(prev => addDaysIso(prev, 1))} disabled={isToday} hitSlop={14} className="active:opacity-60">
          <Ionicons name="chevron-forward" size={16} color={isToday ? '#3A362F' : '#948C7D'} />
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
              setSystolic(digitsOnly(v))
              setValidationError(false)
            }}
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
              color="#948C7D"
            />
          </Pressable>
        </View>

        <View className="min-w-0 flex-1">
          <TextInput
            value={diastolic}
            onChangeText={v => {
              setDiastolic(digitsOnly(v))
              setValidationError(false)
            }}
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
              color="#948C7D"
            />
          </Pressable>
        </View>

        <View className="min-w-0 flex-1">
          <TextInput
            value={pulse}
            onChangeText={v => setPulse(digitsOnly(v))}
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
              color="#948C7D"
            />
          </Pressable>
        </View>
      </View>

      {openInfo ? (
        <View className="mt-2 rounded-md border border-border bg-graph p-3">
          <Text className="text-[11px] leading-4 text-muted">{t(`glossary.${openInfo}`)}</Text>
        </View>
      ) : null}

      {validationError ? (
        <Text className="mt-2 text-xs text-red-400">{t('home.bloodPressure.validationError')}</Text>
      ) : null}

      <Button
        label={t('home.bloodPressure.addButton')}
        variant="ghost"
        onPress={handleAddPress}
        isLoading={isSaving}
        className="mt-3 py-2.5"
      />

      <Link href="/(client)/blood-pressure-history" asChild>
        <Pressable className="mt-3 items-center active:opacity-60">
          <Text className="font-sans-medium text-xs text-gold">{t('history.link')} →</Text>
        </Pressable>
      </Link>
    </View>
  )
}
