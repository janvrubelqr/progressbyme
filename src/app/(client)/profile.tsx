import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { ChipSelect } from '@/components/ui/chip-select'
import { Eyebrow, Heading } from '@/components/ui/heading'
import { MessageBanner, type Message } from '@/components/ui/message-banner'
import { MultiChipSelect } from '@/components/ui/multi-chip-select'
import { digitsOnly } from '@/lib/digits-only'
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
import { type ThemePreference, useThemeStore } from '@/stores/theme-store'
import type { ActivityLevel, FitnessGoal, Sex } from '@/types/database'

const TRAINING_DAYS = [1, 2, 3, 4, 5, 6, 7] as const

export default function ProfileScreen() {
  const { t } = useTranslation()
  const profile = useAuthStore(state => state.profile)
  const setProfile = useAuthStore(state => state.setProfile)
  const email = useAuthStore(state => state.user)?.email
  const themePreference = useThemeStore(state => state.preference)
  const setThemePreference = useThemeStore(state => state.setPreference)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [sex, setSex] = useState<Sex | null>(null)
  const [heightCm, setHeightCm] = useState('')
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | null>(null)
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null)
  const [healthConditions, setHealthConditions] = useState('')
  const [dietaryRestrictions, setDietaryRestrictions] = useState('')
  const [experienceLevel, setExperienceLevel] = useState<DifficultyLevel | null>(null)
  const [equipmentAccess, setEquipmentAccess] = useState<EquipmentType[]>([])
  const [trainingDays, setTrainingDays] = useState<number | null>(null)
  const [injuryTags, setInjuryTags] = useState<ContraindicationTag[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)

  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name ?? '')
    setPhone(profile.phone ?? '')
    setDateOfBirth(profile.date_of_birth ?? '')
    setSex(profile.sex)
    setHeightCm(profile.height_cm != null ? String(profile.height_cm) : '')
    setFitnessGoal(profile.fitness_goal)
    setActivityLevel(profile.activity_level)
    setHealthConditions(profile.health_conditions ?? '')
    setDietaryRestrictions(profile.dietary_restrictions ?? '')
    setExperienceLevel((profile.experience_level as DifficultyLevel) ?? null)
    setEquipmentAccess((profile.equipment_access as EquipmentType[]) ?? [])
    setTrainingDays(profile.training_days_per_week ?? null)
    setInjuryTags((profile.injury_tags as ContraindicationTag[]) ?? [])
  }, [profile])

  const sexOptions: { value: Sex; label: string }[] = [
    { value: 'male', label: t('profile.sexMale') },
    { value: 'female', label: t('profile.sexFemale') },
    { value: 'other', label: t('profile.sexOther') },
  ]

  const goalOptions: { value: FitnessGoal; label: string }[] = [
    { value: 'lose_weight', label: t('profile.goalLoseWeight') },
    { value: 'gain_muscle', label: t('profile.goalGainMuscle') },
    { value: 'maintain', label: t('profile.goalMaintain') },
    { value: 'improve_endurance', label: t('profile.goalImproveEndurance') },
  ]

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: t('profile.themeSystem') },
    { value: 'light', label: t('profile.themeLight') },
    { value: 'dark', label: t('profile.themeDark') },
  ]

  const activityOptions: { value: ActivityLevel; label: string }[] = [
    { value: 'sedentary', label: t('profile.activitySedentary') },
    { value: 'light', label: t('profile.activityLight') },
    { value: 'moderate', label: t('profile.activityModerate') },
    { value: 'active', label: t('profile.activityActive') },
    { value: 'very_active', label: t('profile.activityVeryActive') },
  ]

  const experienceOptions = DIFFICULTY_LEVELS.map(v => ({ value: v, label: t(`trainer.exerciseLibrary.difficultyLevels.${v}`) }))
  // Same reasoning as onboarding: bodyweight isn't a real equipment choice,
  // the plan generator always includes it regardless of this list.
  const equipmentOptions = EQUIPMENT_TYPES.filter(v => v !== 'bodyweight').map(v => ({
    value: v,
    label: t(`trainer.exerciseLibrary.equipmentTypes.${v}`),
  }))
  const injuryOptions = CONTRAINDICATION_TAGS.map(v => ({ value: v, label: t(`trainer.exerciseLibrary.contraindicationTags.${v}`) }))
  const daysOptions = TRAINING_DAYS.map(n => ({ value: String(n), label: String(n) }))

  const handleSave = async () => {
    if (!profile) return
    setMessage(null)
    setIsSaving(true)

    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName || null,
        phone: phone || null,
        date_of_birth: dateOfBirth || null,
        sex,
        height_cm: heightCm ? Number(heightCm) : null,
        fitness_goal: fitnessGoal,
        activity_level: activityLevel,
        health_conditions: healthConditions || null,
        dietary_restrictions: dietaryRestrictions || null,
        experience_level: experienceLevel,
        equipment_access: equipmentAccess,
        training_days_per_week: trainingDays,
        injury_tags: injuryTags,
      })
      .eq('id', profile.id)
      .select()
      .single()

    setIsSaving(false)

    if (error || !data) {
      setMessage({ type: 'error', text: t('profile.saveError') })
      return
    }

    setProfile(data)
    setMessage({ type: 'success', text: t('profile.saveSuccess') })
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-coal" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView className="flex-1 bg-coal" contentContainerClassName="px-5 pb-10 pt-16">
        <Eyebrow>{t('profile.title')}</Eyebrow>
        <Heading underline className="mb-2">
          {t('profile.title')}
        </Heading>
        <Text className="mb-6 text-sm text-muted">{t('profile.subtitle')}</Text>

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">{t('profile.themeLabel')}</Text>
        <ChipSelect options={themeOptions} value={themePreference} onChange={setThemePreference} className="mb-6" />

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">{t('profile.fullNameLabel')}</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder={t('profile.fullNamePlaceholder')}
          className="mb-4 rounded-md border border-border bg-graph px-4 py-3 text-base text-ivory"
        />

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">{t('profile.emailLabel')}</Text>
        <View className="mb-4 rounded-md border border-border-soft bg-coal px-4 py-3">
          <Text className="text-base text-muted">{email ?? '—'}</Text>
        </View>

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">{t('profile.phoneLabel')}</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder={t('profile.phonePlaceholder')}
          className="mb-4 rounded-md border border-border bg-graph px-4 py-3 text-base text-ivory"
        />

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
          {t('profile.dateOfBirthLabel')}
        </Text>
        <TextInput
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder={t('profile.dateOfBirthPlaceholder')}
          className="mb-4 rounded-md border border-border bg-graph px-4 py-3 text-base text-ivory"
        />

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">{t('profile.sexLabel')}</Text>
        <ChipSelect options={sexOptions} value={sex} onChange={setSex} className="mb-4" />

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
          {t('profile.heightLabel')}
        </Text>
        <TextInput
          value={heightCm}
          onChangeText={v => setHeightCm(digitsOnly(v))}
          keyboardType="number-pad"
          placeholder={t('profile.heightPlaceholder')}
          className="mb-4 rounded-md border border-border bg-graph px-4 py-3 text-base text-ivory"
        />

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">{t('profile.goalLabel')}</Text>
        <ChipSelect options={goalOptions} value={fitnessGoal} onChange={setFitnessGoal} className="mb-4" />

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
          {t('profile.activityLabel')}
        </Text>
        <ChipSelect options={activityOptions} value={activityLevel} onChange={setActivityLevel} className="mb-4" />

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
          {t('profile.experienceLabel')}
        </Text>
        <ChipSelect options={experienceOptions} value={experienceLevel} onChange={setExperienceLevel} className="mb-4" />

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
          {t('profile.equipmentLabel')}
        </Text>
        <MultiChipSelect options={equipmentOptions} values={equipmentAccess} onChange={setEquipmentAccess} className="mb-4" />

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
          {t('profile.trainingDaysLabel')}
        </Text>
        <ChipSelect
          options={daysOptions}
          value={trainingDays != null ? String(trainingDays) : null}
          onChange={v => setTrainingDays(Number(v))}
          className="mb-4"
        />

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
          {t('profile.injuriesLabel')}
        </Text>
        <MultiChipSelect options={injuryOptions} values={injuryTags} onChange={setInjuryTags} className="mb-4" />

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
          {t('profile.healthConditionsLabel')}
        </Text>
        <TextInput
          value={healthConditions}
          onChangeText={setHealthConditions}
          placeholder={t('profile.healthConditionsPlaceholder')}
          multiline
          numberOfLines={3}
          className="mb-4 h-20 rounded-md border border-border bg-graph px-4 py-3 text-base text-ivory"
          textAlignVertical="top"
        />

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
          {t('profile.dietaryRestrictionsLabel')}
        </Text>
        <TextInput
          value={dietaryRestrictions}
          onChangeText={setDietaryRestrictions}
          placeholder={t('profile.dietaryRestrictionsPlaceholder')}
          multiline
          numberOfLines={3}
          className="mb-4 h-20 rounded-md border border-border bg-graph px-4 py-3 text-base text-ivory"
          textAlignVertical="top"
        />

        <MessageBanner message={message} />

        <Button label={t('profile.save')} onPress={handleSave} isLoading={isSaving} className="mt-4" />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
