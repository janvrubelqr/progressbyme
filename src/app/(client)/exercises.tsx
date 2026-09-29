import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native'

import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { MultiChipSelect } from '@/components/ui/multi-chip-select'
import { calculateAge } from '@/lib/age'
import { MOVEMENT_TYPES, MUSCLE_GROUPS, type MovementType, type MuscleGroup } from '@/lib/exercise-taxonomy'
import { pickTranslation } from '@/lib/pick-translation'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguageStore } from '@/stores/language-store'

type LibraryExercise = {
  id: string
  name: string
  videoUrl: string | null
  muscleGroups: string[]
  movementType: string | null
  difficulty: string | null
  minAge: number | null
  maxAge: number | null
}

export default function ClientExerciseLibraryScreen() {
  const { t } = useTranslation()
  const language = useLanguageStore(state => state.language)
  const profile = useAuthStore(state => state.profile)

  const [exercises, setExercises] = useState<LibraryExercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup[]>([])
  const [movementFilter, setMovementFilter] = useState<MovementType[]>([])

  useEffect(() => {
    supabase
      .from('exercises')
      .select('id, muscle_groups, movement_type, difficulty, min_age, max_age, exercise_translations(language_code, name, video_url)')
      .then(({ data }) => {
        const rows: LibraryExercise[] = (data ?? []).map(row => {
          const translations = row.exercise_translations as { language_code: string; name: string; video_url: string | null }[]
          const match = pickTranslation(translations, language)
          return {
            id: row.id,
            name: match?.name ?? '',
            videoUrl: match?.video_url ?? null,
            muscleGroups: row.muscle_groups ?? [],
            movementType: row.movement_type,
            difficulty: row.difficulty,
            minAge: row.min_age,
            maxAge: row.max_age,
          }
        })
        setExercises(rows.sort((a, b) => a.name.localeCompare(b.name)))
        setIsLoading(false)
      })
  }, [language])

  const clientAge = profile?.date_of_birth ? calculateAge(profile.date_of_birth) : null

  const filtered = useMemo(() => {
    return exercises.filter(e => {
      if (muscleFilter.length && !muscleFilter.some(m => e.muscleGroups.includes(m))) return false
      if (movementFilter.length && (!e.movementType || !movementFilter.includes(e.movementType as MovementType))) return false
      return true
    })
  }, [exercises, muscleFilter, movementFilter])

  const isAgeAppropriate = (e: LibraryExercise) => {
    if (clientAge == null) return true
    if (e.minAge != null && clientAge < e.minAge) return false
    if (e.maxAge != null && clientAge > e.maxAge) return false
    return true
  }

  const recommended = clientAge != null ? filtered.filter(isAgeAppropriate) : filtered
  const others = clientAge != null ? filtered.filter(e => !isAgeAppropriate(e)) : []

  const muscleOptions = MUSCLE_GROUPS.map(v => ({ value: v, label: t(`trainer.exerciseLibrary.muscleGroups.${v}`) }))
  const movementOptions = MOVEMENT_TYPES.map(v => ({ value: v, label: t(`trainer.exerciseLibrary.movementTypes.${v}`) }))

  const renderExercise = (exercise: LibraryExercise) => (
    <Card key={exercise.id} className="mb-3">
      <Text className="font-display text-base text-ivory">{exercise.name}</Text>
      <View className="mt-2 flex-row flex-wrap gap-1.5">
        {exercise.movementType ? (
          <View className="rounded-full border border-border bg-graph px-2 py-0.5">
            <Text className="text-[10px] text-muted">{t(`trainer.exerciseLibrary.movementTypes.${exercise.movementType}`)}</Text>
          </View>
        ) : null}
        {exercise.difficulty ? (
          <View className="rounded-full border border-border bg-graph px-2 py-0.5">
            <Text className="text-[10px] text-muted">{t(`trainer.exerciseLibrary.difficultyLevels.${exercise.difficulty}`)}</Text>
          </View>
        ) : null}
        {exercise.muscleGroups.map(m => (
          <View key={m} className="rounded-full border border-border bg-graph px-2 py-0.5">
            <Text className="text-[10px] text-muted">{t(`trainer.exerciseLibrary.muscleGroups.${m}`)}</Text>
          </View>
        ))}
      </View>
      {exercise.minAge != null || exercise.maxAge != null ? (
        <Text className="mt-2 text-xs text-muted">
          {t('clientExercises.ageNote', { min: exercise.minAge ?? '0', max: exercise.maxAge ?? '99' })}
        </Text>
      ) : null}
      {exercise.videoUrl ? (
        <Pressable onPress={() => Linking.openURL(exercise.videoUrl!)} className="mt-2 self-start">
          <Text className="text-sm text-gold">{t('workout.video')}</Text>
        </Pressable>
      ) : null}
    </Card>
  )

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-coal">
        <ActivityIndicator color="#D2A85E" />
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-coal" contentContainerClassName="px-5 pb-10 pt-16">
      <Heading underline className="mb-6">
        {t('clientExercises.title')}
      </Heading>

      <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
        {t('clientExercises.filterMuscle')}
      </Text>
      <MultiChipSelect options={muscleOptions} values={muscleFilter} onChange={setMuscleFilter} className="mb-4" />

      <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
        {t('clientExercises.filterMovement')}
      </Text>
      <MultiChipSelect options={movementOptions} values={movementFilter} onChange={setMovementFilter} className="mb-6" />

      {!exercises.length ? <Text className="text-muted">{t('clientExercises.empty')}</Text> : null}

      {clientAge == null && exercises.length ? (
        <Text className="mb-4 text-sm text-muted">{t('clientExercises.noAgeInfo')}</Text>
      ) : null}

      {clientAge != null && recommended.length ? (
        <>
          <Heading className="mb-1 text-base">{t('clientExercises.recommendedTitle')}</Heading>
          <Text className="mb-3 text-xs text-muted">{t('clientExercises.recommendedSubtitle')}</Text>
        </>
      ) : null}
      {recommended.map(renderExercise)}

      {others.length ? (
        <>
          <Heading className="mb-3 mt-4 text-base">{t('clientExercises.otherTitle')}</Heading>
          {others.map(renderExercise)}
        </>
      ) : null}
    </ScrollView>
  )
}
