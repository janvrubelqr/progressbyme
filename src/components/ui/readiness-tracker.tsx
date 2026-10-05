import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, TextInput, View } from 'react-native'

import { SaveStatus, type SaveState } from '@/components/ui/save-status'
import { decimalDigitsOnly } from '@/lib/digits-only'
import { calculateReadinessScore, readinessCategory, type ReadinessCategory } from '@/lib/readiness'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { ReadinessLog } from '@/types/database'

const SAVE_DELAY_MS = 700
const SCALE = [1, 2, 3, 4, 5] as const

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

const CATEGORY_CLASS: Record<ReadinessCategory, string> = {
  low: 'text-amber-400',
  moderate: 'text-ivory',
  high: 'text-good',
}

export function ReadinessTracker({ className }: { className?: string }) {
  const { t } = useTranslation()
  const profile = useAuthStore(state => state.profile)
  const [sleepInput, setSleepInput] = useState('')
  const [energyLevel, setEnergyLevel] = useState<number | null>(null)
  const [sorenessLevel, setSorenessLevel] = useState<number | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase
      .from('readiness_logs')
      .select('*')
      .eq('client_id', profile.id)
      .eq('date', todayIso())
      .maybeSingle()

    const row = data as ReadinessLog | null
    setSleepInput(row?.sleep_hours != null ? String(row.sleep_hours) : '')
    setEnergyLevel(row?.energy_level ?? null)
    setSorenessLevel(row?.soreness_level ?? null)
  }, [profile])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => () => (saveTimeoutRef.current ? clearTimeout(saveTimeoutRef.current) : undefined), [])

  const commitSave = async (sleepRaw: string, energy: number | null, soreness: number | null) => {
    if (!profile) return
    setSaveState('saving')
    await supabase.from('readiness_logs').upsert(
      {
        client_id: profile.id,
        date: todayIso(),
        sleep_hours: sleepRaw ? Number(sleepRaw) : null,
        energy_level: energy,
        soreness_level: soreness,
      },
      { onConflict: 'client_id,date' }
    )
    setSaveState('saved')
    setTimeout(() => setSaveState(s => (s === 'saved' ? 'idle' : s)), 1500)
  }

  const scheduleSave = (sleepRaw: string, energy: number | null, soreness: number | null) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => commitSave(sleepRaw, energy, soreness), SAVE_DELAY_MS)
  }

  const handleSleepChange = (raw: string) => {
    const cleaned = decimalDigitsOnly(raw)
    setSleepInput(cleaned)
    scheduleSave(cleaned, energyLevel, sorenessLevel)
  }

  const handleSleepBlur = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    commitSave(sleepInput, energyLevel, sorenessLevel)
  }

  const handleEnergyPress = (level: number) => {
    setEnergyLevel(level)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    commitSave(sleepInput, level, sorenessLevel)
  }

  const handleSorenessPress = (level: number) => {
    setSorenessLevel(level)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    commitSave(sleepInput, energyLevel, level)
  }

  const score = calculateReadinessScore({
    sleepHours: sleepInput ? Number(sleepInput) : null,
    energyLevel,
    sorenessLevel,
  })
  const category = score != null ? readinessCategory(score) : null

  return (
    <View className={className}>
      <Text className="mb-1 font-display-medium text-[11px] uppercase tracking-[2px] text-gold">
        {t('home.readiness.title')}
      </Text>

      {score != null && category ? (
        <Text className="mb-3 font-display-bold text-2xl text-ivory">
          {score}
          <Text className="font-sans text-sm text-muted"> / 100</Text>
          <Text className={`font-sans-medium text-sm ${CATEGORY_CLASS[category]}`}>
            {'  ·  '}
            {t(`home.readiness.score${category.charAt(0).toUpperCase()}${category.slice(1)}`)}
          </Text>
        </Text>
      ) : (
        <Text className="mb-3 text-sm text-muted">{t('home.readiness.noData')}</Text>
      )}

      <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
        {t('home.readiness.sleepLabel')}
      </Text>
      <TextInput
        value={sleepInput}
        onChangeText={handleSleepChange}
        onBlur={handleSleepBlur}
        keyboardType="decimal-pad"
        placeholder={t('home.readiness.sleepPlaceholder')}
        className="mb-3 rounded-md border border-border bg-graph px-3 py-2 text-base text-ivory"
      />

      <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
        {t('home.readiness.energyLabel')}
      </Text>
      <View className="mb-3 flex-row gap-2">
        {SCALE.map(level => (
          <Pressable
            key={level}
            onPress={() => handleEnergyPress(level)}
            hitSlop={6}
            className={`h-9 flex-1 items-center justify-center rounded-md border active:opacity-70 ${
              energyLevel === level ? 'border-gold bg-gold' : 'border-border bg-graph'
            }`}
          >
            <Text className={`font-sans-medium text-sm ${energyLevel === level ? 'text-on-gold' : 'text-ivory'}`}>
              {level}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
        {t('home.readiness.sorenessLabel')}
        <Text className="text-muted"> · {t('home.readiness.sorenessHint')}</Text>
      </Text>
      <View className="mb-1 flex-row gap-2">
        {SCALE.map(level => (
          <Pressable
            key={level}
            onPress={() => handleSorenessPress(level)}
            hitSlop={6}
            className={`h-9 flex-1 items-center justify-center rounded-md border active:opacity-70 ${
              sorenessLevel === level ? 'border-gold bg-gold' : 'border-border bg-graph'
            }`}
          >
            <Text className={`font-sans-medium text-sm ${sorenessLevel === level ? 'text-on-gold' : 'text-ivory'}`}>
              {level}
            </Text>
          </Pressable>
        ))}
      </View>

      <SaveStatus state={saveState} className="mt-2" />
    </View>
  )
}
