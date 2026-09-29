import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChipSelect } from '@/components/ui/chip-select'
import { Eyebrow } from '@/components/ui/heading'
import { TextField } from '@/components/ui/text-field'
import { WORKOUT_CATEGORIES, type WorkoutCategoryTag } from '@/lib/exercise-taxonomy'
import { LANGUAGE_LABEL } from '@/lib/language-labels'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { SUPPORTED_LANGUAGES, useLanguageStore, type LanguageCode } from '@/stores/language-store'

const EMPTY_TITLES: Record<LanguageCode, string> = { cs: '', en: '', sk: '' }

type ExerciseDraft = {
  exercise_id: string | null
  name: string
  sets: string
  reps: string
  rest_seconds: string
  tempo: string
  video_url: string
  notes: string
}

const emptyExercise: ExerciseDraft = {
  exercise_id: null,
  name: '',
  sets: '',
  reps: '',
  rest_seconds: '',
  tempo: '',
  video_url: '',
  notes: '',
}

type LibraryExercise = { id: string; name: string }

export default function WorkoutBuilderScreen() {
  const { t } = useTranslation()
  const language = useLanguageStore(state => state.language)
  const { id: clientId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const trainerProfile = useAuthStore(state => state.profile)

  const [titles, setTitles] = useState<Record<LanguageCode, string>>(EMPTY_TITLES)
  const [scheduledDate, setScheduledDate] = useState('')
  const [category, setCategory] = useState<WorkoutCategoryTag | null>(null)
  const [exercises, setExercises] = useState<ExerciseDraft[]>([{ ...emptyExercise }])
  const [isSaving, setIsSaving] = useState(false)
  const [library, setLibrary] = useState<LibraryExercise[]>([])
  const [suggestionsFor, setSuggestionsFor] = useState<number | null>(null)

  useEffect(() => {
    supabase
      .from('exercise_translations')
      .select('exercise_id, name')
      .eq('language_code', language)
      .then(({ data }) => {
        setLibrary((data ?? []).map(row => ({ id: row.exercise_id, name: row.name })))
      })
  }, [language])

  const updateExercise = (index: number, patch: Partial<ExerciseDraft>) => {
    setExercises(prev => prev.map((exercise, i) => (i === index ? { ...exercise, ...patch } : exercise)))
  }

  const handleNameChange = (index: number, value: string) => {
    updateExercise(index, { name: value, exercise_id: null })
    setSuggestionsFor(value ? index : null)
  }

  const pickLibraryExercise = (index: number, item: LibraryExercise) => {
    updateExercise(index, { name: item.name, exercise_id: item.id })
    setSuggestionsFor(null)
  }

  const addExercise = () => setExercises(prev => [...prev, { ...emptyExercise }])
  const removeExercise = (index: number) => setExercises(prev => prev.filter((_, i) => i !== index))

  const moveExercise = (index: number, direction: -1 | 1) => {
    setExercises(prev => {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next
    })
  }

  const handleSave = async () => {
    const hasAnyTitle = SUPPORTED_LANGUAGES.some(lang => titles[lang].trim())
    if (!trainerProfile || !hasAnyTitle || exercises.every(e => !e.name)) {
      Alert.alert(t('trainer.workoutBuilder.title'), t('trainer.workoutBuilder.validationError'))
      return
    }

    setIsSaving(true)

    const fallbackTitle = titles[language].trim() || SUPPORTED_LANGUAGES.map(lang => titles[lang].trim()).find(Boolean)!

    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        client_id: clientId,
        trainer_id: trainerProfile.id,
        title: fallbackTitle,
        scheduled_date: scheduledDate || null,
        category,
      })
      .select()
      .single()

    if (workoutError || !workout) {
      setIsSaving(false)
      Alert.alert(t('trainer.workoutBuilder.title'), t('trainer.workoutBuilder.saveWorkoutError'))
      return
    }

    const translationRows = SUPPORTED_LANGUAGES.filter(lang => titles[lang].trim()).map(lang => ({
      workout_id: workout.id,
      language_code: lang,
      title: titles[lang].trim(),
    }))

    const { error: translationsError } = await supabase.from('workout_translations').insert(translationRows)

    if (translationsError) {
      setIsSaving(false)
      Alert.alert(t('trainer.workoutBuilder.title'), t('trainer.workoutBuilder.saveWorkoutError'))
      return
    }

    const rows = exercises
      .filter(e => e.name)
      .map((exercise, index) => ({
        workout_id: workout.id,
        exercise_id: exercise.exercise_id,
        order_index: index,
        // For a library exercise the name/video are resolved per-language at
        // display time, so we only need to store the fallback name here.
        name: exercise.name,
        sets: Number(exercise.sets) || 0,
        reps: exercise.reps,
        rest_seconds: exercise.rest_seconds ? Number(exercise.rest_seconds) : null,
        tempo: exercise.tempo || null,
        video_url: exercise.video_url || null,
        notes: exercise.notes || null,
      }))

    const { error: exercisesError } = await supabase.from('workout_exercises').insert(rows)

    setIsSaving(false)

    if (exercisesError) {
      Alert.alert(t('trainer.workoutBuilder.title'), t('trainer.workoutBuilder.saveExercisesError'))
      return
    }

    Alert.alert(t('trainer.workoutBuilder.saveSuccessTitle'), t('trainer.workoutBuilder.saveSuccess'))
    router.back()
  }

  return (
    <ScrollView className="flex-1 bg-coal" contentContainerClassName="px-5 py-6 pb-16">
      {SUPPORTED_LANGUAGES.map(lang => (
        <View key={lang} className="mb-2">
          <Text className="mb-2 font-display-medium text-xs uppercase tracking-[1px] text-gold">
            {LANGUAGE_LABEL[lang]}
          </Text>
          <TextField
            label={t('trainer.workoutBuilder.workoutTitleLabel')}
            value={titles[lang]}
            onChangeText={v => setTitles(prev => ({ ...prev, [lang]: v }))}
            placeholder={t('trainer.workoutBuilder.workoutTitlePlaceholder')}
          />
        </View>
      ))}
      <TextField
        label={t('trainer.workoutBuilder.dateLabel')}
        value={scheduledDate}
        onChangeText={setScheduledDate}
        placeholder={t('trainer.workoutBuilder.datePlaceholder')}
      />

      <Eyebrow className="mb-2">{t('trainer.workoutBuilder.categoryLabel')}</Eyebrow>
      <ChipSelect
        options={WORKOUT_CATEGORIES.map(c => ({ value: c, label: t(`workout.categories.${c}`) }))}
        value={category}
        onChange={setCategory}
        className="mb-4"
      />

      <Eyebrow className="mb-3 mt-4">{t('trainer.workoutBuilder.exercisesLabel')}</Eyebrow>

      {exercises.map((exercise, index) => {
        const suggestions =
          suggestionsFor === index
            ? library.filter(item => item.name.toLowerCase().includes(exercise.name.toLowerCase())).slice(0, 5)
            : []

        return (
          <Card key={index} className="mb-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="font-display text-sm text-ivory">
                {t('trainer.workoutBuilder.exerciseCardTitle', { n: index + 1 })}
              </Text>
              <View className="flex-row items-center gap-3">
                <Pressable onPress={() => moveExercise(index, -1)} disabled={index === 0} hitSlop={12} className="active:opacity-60">
                  <Ionicons name="chevron-up" size={18} color={index === 0 ? '#3A362F' : '#948C7D'} />
                </Pressable>
                <Pressable onPress={() => moveExercise(index, 1)} disabled={index === exercises.length - 1} hitSlop={12} className="active:opacity-60">
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={index === exercises.length - 1 ? '#3A362F' : '#948C7D'}
                  />
                </Pressable>
                {exercises.length > 1 ? (
                  <Pressable onPress={() => removeExercise(index)} hitSlop={8} className="active:opacity-60">
                    <Text className="text-sm text-red-400">{t('trainer.workoutBuilder.remove')}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <TextField
              label={t('trainer.workoutBuilder.nameLabel')}
              value={exercise.name}
              onChangeText={v => handleNameChange(index, v)}
              onFocus={() => setSuggestionsFor(index)}
              onBlur={() => setTimeout(() => setSuggestionsFor(null), 150)}
              containerClassName={suggestions.length ? 'mb-0' : undefined}
            />
            {suggestions.length ? (
              <View className="mb-4 overflow-hidden rounded-md border border-border bg-graph">
                {suggestions.map(item => (
                  <Pressable
                    key={item.id}
                    onPress={() => pickLibraryExercise(index, item)}
                    className="min-h-11 justify-center border-b border-border-soft px-3 py-2 last:border-b-0 active:bg-graph"
                  >
                    <Text className="text-sm text-ivory">{item.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextField
                  label={t('trainer.workoutBuilder.setsLabel')}
                  value={exercise.sets}
                  onChangeText={v => updateExercise(index, { sets: v })}
                  keyboardType="number-pad"
                />
              </View>
              <View className="flex-1">
                <TextField
                  label={t('trainer.workoutBuilder.repsLabel')}
                  value={exercise.reps}
                  onChangeText={v => updateExercise(index, { reps: v })}
                  placeholder={t('trainer.workoutBuilder.repsPlaceholder')}
                />
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextField
                  label={t('trainer.workoutBuilder.restLabel')}
                  value={exercise.rest_seconds}
                  onChangeText={v => updateExercise(index, { rest_seconds: v })}
                  keyboardType="number-pad"
                />
              </View>
              <View className="flex-1">
                <TextField
                  label={t('trainer.workoutBuilder.tempoLabel')}
                  value={exercise.tempo}
                  onChangeText={v => updateExercise(index, { tempo: v })}
                  placeholder={t('trainer.workoutBuilder.tempoPlaceholder')}
                />
              </View>
            </View>
            <TextField
              label={t('trainer.workoutBuilder.videoUrlLabel')}
              value={exercise.video_url}
              onChangeText={v => updateExercise(index, { video_url: v })}
              editable={!exercise.exercise_id}
            />
            {exercise.exercise_id ? (
              <Text className="-mt-3 mb-3 text-xs text-muted">
                {language === 'cs'
                  ? 'Video se automaticky použije z knihovny cviků pro daný jazyk.'
                  : language === 'sk'
                    ? 'Video sa automaticky použije z knižnice cvikov pre daný jazyk.'
                    : "Video is used automatically from the exercise library for each language."}
              </Text>
            ) : null}
            <TextField
              label={t('trainer.workoutBuilder.notesLabel')}
              value={exercise.notes}
              onChangeText={v => updateExercise(index, { notes: v })}
              containerClassName="mb-0"
            />
          </Card>
        )
      })}

      <Button label={t('trainer.workoutBuilder.addExercise')} variant="ghost" onPress={addExercise} className="mb-6" />
      <Button label={t('trainer.workoutBuilder.save')} onPress={handleSave} isLoading={isSaving} />
    </ScrollView>
  )
}
