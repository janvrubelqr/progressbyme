import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { pickTranslation } from '@/lib/pick-translation'
import { resolveExerciseDisplay, type ResolvedExercise } from '@/lib/resolve-exercise'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguageStore } from '@/stores/language-store'
import { getYoutubeThumbnail } from '@/lib/youtube-thumbnail'
import type { Workout } from '@/types/database'

export default function WorkoutDetailScreen() {
  const { t } = useTranslation()
  const language = useLanguageStore(state => state.language)
  const { id } = useLocalSearchParams<{ id: string }>()
  const profile = useAuthStore(state => state.profile)
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [displayTitle, setDisplayTitle] = useState('')
  const [exercises, setExercises] = useState<ResolvedExercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLogging, setIsLogging] = useState(false)

  const loadWorkout = useCallback(async () => {
    setIsLoading(true)
    const [{ data: workoutData }, { data: exerciseData }] = await Promise.all([
      supabase.from('workouts').select('*, workout_translations(language_code, title)').eq('id', id).single(),
      supabase.from('workout_exercises').select('*').eq('workout_id', id).order('order_index', { ascending: true }),
    ])

    setWorkout(workoutData)
    const translations = (workoutData?.workout_translations ?? []) as { language_code: string; title: string }[]
    setDisplayTitle(pickTranslation(translations, language)?.title ?? workoutData?.title ?? '')
    setExercises(await resolveExerciseDisplay(exerciseData ?? [], language))
    setIsLoading(false)
  }, [id, language])

  useEffect(() => {
    loadWorkout()
  }, [loadWorkout])

  const handleLogWorkout = async () => {
    if (!profile || !workout) return
    setIsLogging(true)

    const { error } = await supabase.from('workout_logs').insert({
      workout_id: workout.id,
      client_id: profile.id,
      completed_at: new Date().toISOString(),
    })

    setIsLogging(false)

    if (error) {
      Alert.alert(t('workout.logErrorTitle'), t('workout.logError'))
    } else {
      Alert.alert(t('workout.logSuccessTitle'), t('workout.logSuccess'))
    }
  }

  if (isLoading || !workout) {
    return (
      <View className="flex-1 items-center justify-center bg-coal">
        <ActivityIndicator color="#D2A85E" />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-coal">
      <ScrollView contentContainerClassName="px-5 pb-28 pt-4">
        <Text className="mb-4 font-display-bold text-xl uppercase tracking-[1px] text-ivory">{displayTitle}</Text>

        {exercises.map(exercise => {
          const thumbnail = exercise.displayVideoUrl ? getYoutubeThumbnail(exercise.displayVideoUrl) : null

          return (
            <Card key={exercise.id} className="mb-3">
              <View className="flex-row items-center">
                {exercise.displayVideoUrl ? (
                  <Pressable
                    onPress={() => Linking.openURL(exercise.displayVideoUrl!)}
                    className="mr-3 h-16 w-16 items-center justify-center overflow-hidden rounded-md bg-graph active:opacity-70"
                  >
                    {thumbnail ? (
                      <Image source={{ uri: thumbnail }} className="absolute h-16 w-16" resizeMode="cover" />
                    ) : null}
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-coal/60">
                      <Ionicons name="play" size={16} color="#F2E7CF" style={{ marginLeft: 2 }} />
                    </View>
                  </Pressable>
                ) : null}

                <Text className="flex-1 font-display text-base text-ivory">{exercise.displayName}</Text>
              </View>

              <View className="mt-3 flex-row flex-wrap gap-2">
                <Tag label={`${t('workout.sets')}: ${exercise.sets}`} />
                <Tag label={`${t('workout.reps')}: ${exercise.reps}`} />
                {exercise.rest_seconds ? <Tag label={`${t('workout.rest')}: ${exercise.rest_seconds}s`} /> : null}
                {exercise.tempo ? <Tag label={`${t('workout.tempo')}: ${exercise.tempo}`} /> : null}
              </View>

              {exercise.notes ? <Text className="mt-3 text-sm text-muted">{exercise.notes}</Text> : null}
            </Card>
          )
        })}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-coal px-5 pb-8 pt-3">
        <Button
          label={isLogging ? t('workout.logging') : t('workout.logButton')}
          onPress={handleLogWorkout}
          isLoading={isLogging}
        />
      </View>
    </View>
  )
}

function Tag({ label }: { label: string }) {
  return (
    <View className="rounded-full border border-border bg-coal px-3 py-1">
      <Text className="font-sans-medium text-xs text-muted">{label}</Text>
    </View>
  )
}
