import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { ChipSelect } from '@/components/ui/chip-select'
import { Heading } from '@/components/ui/heading'
import { MessageBanner, type Message } from '@/components/ui/message-banner'
import { MultiChipSelect } from '@/components/ui/multi-chip-select'
import { TextField } from '@/components/ui/text-field'
import { digitsOnly } from '@/lib/digits-only'
import {
  CONTRAINDICATION_TAGS,
  DIFFICULTY_LEVELS,
  EQUIPMENT_TYPES,
  MOVEMENT_TYPES,
  MUSCLE_GROUPS,
  type ContraindicationTag,
  type DifficultyLevel,
  type EquipmentType,
  type MovementType,
  type MuscleGroup,
} from '@/lib/exercise-taxonomy'
import { LANGUAGE_LABEL } from '@/lib/language-labels'
import { isWeightSumValid, sumExerciseWeights } from '@/lib/muscle-load'
import { supabase } from '@/lib/supabase'
import type { ExerciseMuscleWeight } from '@/types/database'
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/stores/language-store'

const EMPTY_TEXT: Record<LanguageCode, string> = { cs: '', en: '', sk: '' }

export default function ExerciseFormScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const isNew = id === 'new'

  const [slug, setSlug] = useState('')
  const [names, setNames] = useState<Record<LanguageCode, string>>(EMPTY_TEXT)
  const [descriptions, setDescriptions] = useState<Record<LanguageCode, string>>(EMPTY_TEXT)
  const [videos, setVideos] = useState<Record<LanguageCode, string>>(EMPTY_TEXT)

  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  // Percent strings ("60" = 60%) keyed by muscle, only for muscles currently
  // in `muscleGroups` — kept separate from the tag list itself since not
  // every selected muscle group necessarily has a weight assigned yet.
  const [muscleWeights, setMuscleWeights] = useState<Record<string, string>>({})
  const [movementType, setMovementType] = useState<MovementType | null>(null)
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null)
  const [equipment, setEquipment] = useState<EquipmentType | null>(null)
  const [minAge, setMinAge] = useState('')
  const [maxAge, setMaxAge] = useState('')
  const [contraindications, setContraindications] = useState<ContraindicationTag[]>([])

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)

  useEffect(() => {
    if (isNew) return

    supabase
      .from('exercises')
      .select(
        'slug, muscle_groups, movement_type, difficulty, equipment, min_age, max_age, contraindications, exercise_translations(language_code, name, description, video_url), exercise_muscle_weights(muscle, weight)'
      )
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!data) {
          setIsLoading(false)
          return
        }
        setSlug(data.slug)
        setMuscleGroups((data.muscle_groups ?? []) as MuscleGroup[])
        const nextWeights: Record<string, string> = {}
        for (const row of (data.exercise_muscle_weights ?? []) as ExerciseMuscleWeight[]) {
          nextWeights[row.muscle] = String(Math.round(row.weight * 100))
        }
        setMuscleWeights(nextWeights)
        setMovementType(data.movement_type as MovementType | null)
        setDifficulty(data.difficulty as DifficultyLevel | null)
        setEquipment(data.equipment as EquipmentType | null)
        setMinAge(data.min_age != null ? String(data.min_age) : '')
        setMaxAge(data.max_age != null ? String(data.max_age) : '')
        setContraindications((data.contraindications ?? []) as ContraindicationTag[])

        const nextNames = { ...EMPTY_TEXT }
        const nextDescriptions = { ...EMPTY_TEXT }
        const nextVideos = { ...EMPTY_TEXT }
        for (const row of data.exercise_translations as {
          language_code: string
          name: string
          description: string | null
          video_url: string | null
        }[]) {
          if (SUPPORTED_LANGUAGES.includes(row.language_code as LanguageCode)) {
            const lang = row.language_code as LanguageCode
            nextNames[lang] = row.name
            nextDescriptions[lang] = row.description ?? ''
            nextVideos[lang] = row.video_url ?? ''
          }
        }
        setNames(nextNames)
        setDescriptions(nextDescriptions)
        setVideos(nextVideos)
        setIsLoading(false)
      })
  }, [id, isNew])

  const handleSave = async () => {
    setMessage(null)
    const hasAnyName = SUPPORTED_LANGUAGES.some(lang => names[lang].trim())
    if (!slug.trim() || !hasAnyName) {
      setMessage({ type: 'error', text: t('trainer.exerciseLibrary.validationError') })
      return
    }

    setIsSaving(true)

    const exerciseFields = {
      slug: slug.trim(),
      muscle_groups: muscleGroups,
      movement_type: movementType,
      difficulty,
      equipment,
      min_age: minAge ? Number(minAge) : null,
      max_age: maxAge ? Number(maxAge) : null,
      contraindications,
    }

    let exerciseId: string | null = isNew ? null : id

    if (isNew) {
      const { data, error } = await supabase.from('exercises').insert(exerciseFields).select().single()
      if (error || !data) {
        setIsSaving(false)
        setMessage({ type: 'error', text: t('trainer.exerciseLibrary.saveError') })
        return
      }
      exerciseId = data.id
    } else {
      const { error } = await supabase.from('exercises').update(exerciseFields).eq('id', id)
      if (error) {
        setIsSaving(false)
        setMessage({ type: 'error', text: t('trainer.exerciseLibrary.saveError') })
        return
      }
    }

    const rows = SUPPORTED_LANGUAGES.filter(lang => names[lang].trim()).map(lang => ({
      exercise_id: exerciseId,
      language_code: lang,
      name: names[lang].trim(),
      description: descriptions[lang].trim() || null,
      video_url: videos[lang].trim() || null,
    }))

    const { error: translationsError } = await supabase
      .from('exercise_translations')
      .upsert(rows, { onConflict: 'exercise_id,language_code' })

    // Muscle weights have no stable per-row id to upsert against from this
    // form, so replace the whole set for this exercise — simplest way to
    // also handle a muscle being deselected or its weight cleared to empty.
    const weightRows = muscleGroups
      .map(muscle => ({ exercise_id: exerciseId, muscle, weight: Number(muscleWeights[muscle] ?? 0) / 100 }))
      .filter(row => row.weight > 0)

    const { error: deleteWeightsError } = await supabase
      .from('exercise_muscle_weights')
      .delete()
      .eq('exercise_id', exerciseId)

    const { error: weightsError } =
      !deleteWeightsError && weightRows.length > 0
        ? await supabase.from('exercise_muscle_weights').insert(weightRows)
        : { error: deleteWeightsError }

    setIsSaving(false)

    if (translationsError || weightsError) {
      setMessage({ type: 'error', text: t('trainer.exerciseLibrary.saveError') })
      return
    }

    setMessage({ type: 'success', text: t('trainer.exerciseLibrary.saveSuccess') })
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(trainer)/exercises')
    }
  }

  if (isLoading) {
    return <View className="flex-1 bg-coal" />
  }

  const activeWeights = muscleGroups
    .map(muscle => ({ muscle, weight: Number(muscleWeights[muscle] ?? 0) / 100 }))
    .filter(w => w.weight > 0) as ExerciseMuscleWeight[]
  const weightSumPercent = Math.round(sumExerciseWeights(activeWeights) * 100)
  const weightSumValid = activeWeights.length === 0 || isWeightSumValid(activeWeights)

  const muscleGroupOptions = MUSCLE_GROUPS.map(v => ({ value: v, label: t(`trainer.exerciseLibrary.muscleGroups.${v}`) }))
  const movementTypeOptions = MOVEMENT_TYPES.map(v => ({ value: v, label: t(`trainer.exerciseLibrary.movementTypes.${v}`) }))
  const difficultyOptions = DIFFICULTY_LEVELS.map(v => ({ value: v, label: t(`trainer.exerciseLibrary.difficultyLevels.${v}`) }))
  const equipmentOptions = EQUIPMENT_TYPES.map(v => ({ value: v, label: t(`trainer.exerciseLibrary.equipmentTypes.${v}`) }))
  const contraindicationOptions = CONTRAINDICATION_TAGS.map(v => ({
    value: v,
    label: t(`trainer.exerciseLibrary.contraindicationTags.${v}`),
  }))

  return (
    <KeyboardAvoidingView className="flex-1 bg-coal" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView className="flex-1 bg-coal" contentContainerClassName="px-5 py-6">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(trainer)/exercises'))}
          hitSlop={12}
          className="mb-4 flex-row items-center gap-1.5 self-start active:opacity-60"
        >
          <Ionicons name="chevron-back" size={16} color="#D2A85E" />
          <Text className="font-sans-medium text-sm text-gold">{t('trainer.exerciseLibrary.backToLibrary')}</Text>
        </Pressable>

        <Heading underline className="mb-6">
          {isNew ? t('trainer.exerciseLibrary.newTitle') : t('trainer.exerciseLibrary.editTitle')}
        </Heading>

        <TextField
          label={t('trainer.exerciseLibrary.slugLabel')}
          value={slug}
          onChangeText={setSlug}
          autoCapitalize="none"
          placeholder={t('trainer.exerciseLibrary.slugPlaceholder')}
        />
        <Text className="-mt-3 mb-4 text-xs text-muted">{t('trainer.exerciseLibrary.slugHint')}</Text>

        {SUPPORTED_LANGUAGES.map(lang => (
          <View key={lang} className="mb-2">
            <Text className="mb-2 font-display-medium text-xs uppercase tracking-[1px] text-gold">
              {LANGUAGE_LABEL[lang]}
            </Text>
            <TextField
              label={t('trainer.exerciseLibrary.nameLabel')}
              value={names[lang]}
              onChangeText={v => setNames(prev => ({ ...prev, [lang]: v }))}
            />
            <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
              {t('trainer.exerciseLibrary.descriptionLabel')}
            </Text>
            <TextInput
              value={descriptions[lang]}
              onChangeText={v => setDescriptions(prev => ({ ...prev, [lang]: v }))}
              placeholder={t('trainer.exerciseLibrary.descriptionPlaceholder')}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="mb-4 h-20 rounded-md border border-border bg-graph px-4 py-3 text-base text-ivory"
            />
            <TextField
              label={t('trainer.exerciseLibrary.videoLabel')}
              value={videos[lang]}
              onChangeText={v => setVideos(prev => ({ ...prev, [lang]: v }))}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        ))}

        <Text className="mb-1.5 mt-2 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
          {t('trainer.exerciseLibrary.muscleGroupsLabel')}
        </Text>
        <MultiChipSelect options={muscleGroupOptions} values={muscleGroups} onChange={setMuscleGroups} className="mb-3" />

        {muscleGroups.length > 0 ? (
          <View className="mb-4 rounded-md border border-border bg-graph p-3">
            <Text className="mb-2.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
              {t('trainer.exerciseLibrary.muscleWeightsLabel')}
            </Text>
            {muscleGroups.map(muscle => (
              <View key={muscle} className="mb-2 flex-row items-center justify-between gap-3 last:mb-0">
                <Text className="flex-1 text-sm text-ivory">{t(`trainer.exerciseLibrary.muscleGroups.${muscle}`)}</Text>
                <View className="flex-row items-center gap-1.5">
                  <TextInput
                    value={muscleWeights[muscle] ?? ''}
                    onChangeText={v => setMuscleWeights(prev => ({ ...prev, [muscle]: digitsOnly(v).slice(0, 3) }))}
                    keyboardType="number-pad"
                    placeholder="0"
                    className="w-14 rounded-md border border-border bg-coal px-2 py-1.5 text-right text-sm text-ivory"
                  />
                  <Text className="text-sm text-muted">%</Text>
                </View>
              </View>
            ))}
            <Text className={`mt-2.5 text-xs ${weightSumValid ? 'text-muted' : 'text-amber-400'}`}>
              {t('trainer.exerciseLibrary.muscleWeightsSum', { percent: weightSumPercent })}
              {!weightSumValid ? ` · ${t('trainer.exerciseLibrary.muscleWeightsSumWarning')}` : ''}
            </Text>
          </View>
        ) : null}

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
          {t('trainer.exerciseLibrary.movementTypeLabel')}
        </Text>
        <ChipSelect options={movementTypeOptions} value={movementType} onChange={setMovementType} className="mb-4" />

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
          {t('trainer.exerciseLibrary.difficultyLabel')}
        </Text>
        <ChipSelect options={difficultyOptions} value={difficulty} onChange={setDifficulty} className="mb-4" />

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
          {t('trainer.exerciseLibrary.equipmentLabel')}
        </Text>
        <ChipSelect options={equipmentOptions} value={equipment} onChange={setEquipment} className="mb-4" />

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
          {t('trainer.exerciseLibrary.ageRangeLabel')}
        </Text>
        <View className="mb-4 flex-row items-center gap-2">
          <TextInput
            value={minAge}
            onChangeText={v => setMinAge(digitsOnly(v))}
            keyboardType="number-pad"
            placeholder={t('trainer.exerciseLibrary.minAgePlaceholder')}
            className="min-w-0 flex-1 rounded-md border border-border bg-graph px-4 py-3 text-base text-ivory"
          />
          <Text className="text-muted">–</Text>
          <TextInput
            value={maxAge}
            onChangeText={v => setMaxAge(digitsOnly(v))}
            keyboardType="number-pad"
            placeholder={t('trainer.exerciseLibrary.maxAgePlaceholder')}
            className="min-w-0 flex-1 rounded-md border border-border bg-graph px-4 py-3 text-base text-ivory"
          />
        </View>

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
          {t('trainer.exerciseLibrary.contraindicationsLabel')}
        </Text>
        <MultiChipSelect
          options={contraindicationOptions}
          values={contraindications}
          onChange={setContraindications}
          className="mb-4"
        />

        <MessageBanner message={message} />

        <Button label={t('trainer.exerciseLibrary.save')} onPress={handleSave} isLoading={isSaving} className="mt-4" />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
