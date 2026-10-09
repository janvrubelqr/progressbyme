import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { ChipSelect } from '@/components/ui/chip-select'
import { Eyebrow, Heading } from '@/components/ui/heading'
import { MultiChipSelect } from '@/components/ui/multi-chip-select'
import {
  CONTRAINDICATION_TAGS,
  DIFFICULTY_LEVELS,
  EQUIPMENT_TYPES,
  type ContraindicationTag,
  type DifficultyLevel,
  type EquipmentType,
} from '@/lib/exercise-taxonomy'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { FitnessGoal } from '@/types/database'

const TRAINING_DAYS = [1, 2, 3, 4, 5, 6, 7] as const
const TOTAL_STEPS = 5

export default function OnboardingScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const profile = useAuthStore(state => state.profile)
  const setProfile = useAuthStore(state => state.setProfile)

  const [step, setStep] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  const [goal, setGoal] = useState<FitnessGoal | null>(null)
  const [experienceLevel, setExperienceLevel] = useState<DifficultyLevel | null>(null)
  const [equipmentAccess, setEquipmentAccess] = useState<EquipmentType[]>([])
  const [trainingDays, setTrainingDays] = useState<number | null>(null)
  const [injuryTags, setInjuryTags] = useState<ContraindicationTag[]>([])

  const goalOptions: { value: FitnessGoal; label: string }[] = [
    { value: 'lose_weight', label: t('profile.goalLoseWeight') },
    { value: 'gain_muscle', label: t('profile.goalGainMuscle') },
    { value: 'maintain', label: t('profile.goalMaintain') },
    { value: 'improve_endurance', label: t('profile.goalImproveEndurance') },
  ]
  const experienceOptions = DIFFICULTY_LEVELS.map(v => ({ value: v, label: t(`trainer.exerciseLibrary.difficultyLevels.${v}`) }))
  // "bodyweight" isn't a real choice here — the plan generator always
  // includes bodyweight exercises regardless of what's selected (everyone
  // has their own body available), so showing it as a checkbox implied
  // unchecking it would exclude those exercises, which it never did.
  const equipmentOptions = EQUIPMENT_TYPES.filter(v => v !== 'bodyweight').map(v => ({
    value: v,
    label: t(`trainer.exerciseLibrary.equipmentTypes.${v}`),
  }))
  const injuryOptions = CONTRAINDICATION_TAGS.map(v => ({ value: v, label: t(`trainer.exerciseLibrary.contraindicationTags.${v}`) }))
  const daysOptions = TRAINING_DAYS.map(n => ({ value: String(n), label: String(n) }))

  const canContinue = [goal != null, experienceLevel != null, true, trainingDays != null, true][step]
  const isLastStep = step === TOTAL_STEPS - 1

  const handleNext = async () => {
    if (!canContinue) return
    if (!isLastStep) {
      setStep(s => s + 1)
      return
    }

    if (!profile) return
    setIsSaving(true)

    const { data, error } = await supabase
      .from('profiles')
      .update({
        fitness_goal: goal,
        experience_level: experienceLevel,
        equipment_access: equipmentAccess,
        training_days_per_week: trainingDays,
        injury_tags: injuryTags,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
      .select()
      .single()

    if (!error && data) {
      setProfile(data)
      // Best-effort, both in parallel: a client should never get stuck on
      // onboarding because plan generation hit a snag — they just land on
      // Home with no workouts/nutrition plan yet, same as before either
      // of these existed.
      await Promise.allSettled([
        supabase.functions.invoke('generate-starter-plan', { body: { client_id: data.id } }),
        supabase.functions.invoke('generate-starter-nutrition-plan', { body: { client_id: data.id } }),
      ])
      setIsSaving(false)
      router.replace('/(client)/home')
    } else {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1)
  }

  return (
    <View className="flex-1 bg-coal">
      <ScrollView contentContainerClassName="flex-grow px-6 pb-8 pt-20">
        <View className="mb-8 flex-row gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-gold' : 'bg-border'}`} />
          ))}
        </View>

        <Eyebrow className="mb-2">{t('onboarding.eyebrow', { current: step + 1, total: TOTAL_STEPS })}</Eyebrow>

        {step === 0 ? (
          <Step title={t('onboarding.goalTitle')} subtitle={t('onboarding.goalSubtitle')}>
            <ChipSelect options={goalOptions} value={goal} onChange={setGoal} />
          </Step>
        ) : null}

        {step === 1 ? (
          <Step title={t('onboarding.experienceTitle')} subtitle={t('onboarding.experienceSubtitle')}>
            <ChipSelect options={experienceOptions} value={experienceLevel} onChange={setExperienceLevel} />
          </Step>
        ) : null}

        {step === 2 ? (
          <Step title={t('onboarding.equipmentTitle')} subtitle={t('onboarding.equipmentSubtitle')}>
            <MultiChipSelect options={equipmentOptions} values={equipmentAccess} onChange={setEquipmentAccess} />
          </Step>
        ) : null}

        {step === 3 ? (
          <Step title={t('onboarding.daysTitle')} subtitle={t('onboarding.daysSubtitle')}>
            <ChipSelect
              options={daysOptions}
              value={trainingDays != null ? String(trainingDays) : null}
              onChange={v => setTrainingDays(Number(v))}
            />
          </Step>
        ) : null}

        {step === 4 ? (
          <Step title={t('onboarding.injuriesTitle')} subtitle={t('onboarding.injuriesSubtitle')}>
            <MultiChipSelect options={injuryOptions} values={injuryTags} onChange={setInjuryTags} />
          </Step>
        ) : null}

        <View className="mt-auto flex-row gap-3 pt-10">
          {step > 0 ? (
            <Button label={t('onboarding.back')} variant="ghost" onPress={handleBack} className="flex-1" />
          ) : null}
          <Button
            label={isLastStep ? t('onboarding.finish') : t('onboarding.next')}
            onPress={handleNext}
            isLoading={isSaving}
            disabled={!canContinue}
            className="flex-1"
          />
        </View>
      </ScrollView>
    </View>
  )
}

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <>
      <Heading underline className="mb-2">
        {title}
      </Heading>
      <Text className="mb-6 text-sm leading-5 text-muted">{subtitle}</Text>
      {children}
    </>
  )
}
