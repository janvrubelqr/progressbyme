import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCoachMessage } from '@/hooks/use-coach-message'
import { todayIso } from '@/lib/last-days'
import { pickTranslation } from '@/lib/pick-translation'
import { calculateReadinessScore, readinessCategory, readinessVolumeMultiplier } from '@/lib/readiness'
import { resolveExerciseDisplay, type ResolvedExercise } from '@/lib/resolve-exercise'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguageStore } from '@/stores/language-store'
import { getYoutubeThumbnail } from '@/lib/youtube-thumbnail'
import type { ReadinessLog, Workout } from '@/types/database'

export default function WorkoutDetailScreen() {
  const { t } = useTranslation()
  const language = useLanguageStore(state => state.language)
  const { id } = useLocalSearchParams<{ id: string }>()
  const profile = useAuthStore(state => state.profile)
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [displayTitle, setDisplayTitle] = useState('')
  const [exercises, setExercises] = useState<ResolvedExercise[]>([])
  const [todayReadiness, setTodayReadiness] = useState<ReadinessLog | null>(null)
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

    // Only today's workout gets a readiness-based adjustment — a future or
    // past session isn't affected by how the client feels right now.
    if (profile && workoutData?.scheduled_date === todayIso()) {
      const { data: readinessData } = await supabase
        .from('readiness_logs')
        .select('*')
        .eq('client_id', profile.id)
        .eq('date', todayIso())
        .maybeSingle()
      setTodayReadiness(readinessData)
    } else {
      setTodayReadiness(null)
    }

    setIsLoading(false)
  }, [id, language, profile])

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

  const readinessScore = todayReadiness
    ? calculateReadinessScore({
        sleepHours: todayReadiness.sleep_hours,
        energyLevel: todayReadiness.energy_level,
        sorenessLevel: todayReadiness.soreness_level,
      })
    : null
  const readinessCat = readinessScore != null ? readinessCategory(readinessScore) : null
  const volumeMultiplier = readinessCat ? readinessVolumeMultiplier(readinessCat) : 1
  const isAdjustedToday = volumeMultiplier < 1

  // Hooks must run unconditionally (before the loading early-return below),
  // so the "should we even ask the coach" check lives inside the params
  // instead of around the hook call.
  const { message: coachMessage } = useCoachMessage(
    isAdjustedToday && !isLoading
      ? {
          workoutTitle: displayTitle,
          isAdjusted: isAdjustedToday,
          readinessCategory: readinessCat,
          goal: profile?.fitness_goal ?? null,
          experienceLevel: profile?.experience_level ?? null,
          language,
        }
      : null
  )

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

        {isAdjustedToday ? (
          <View className="mb-4 rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2.5">
            <Text className="text-sm leading-5 text-amber-400">
              {coachMessage ?? t('workout.readinessAdjustedNotice')}
            </Text>
          </View>
        ) : null}

        {exercises.map(exercise => {
          const thumbnail = exercise.displayVideoUrl ? getYoutubeThumbnail(exercise.displayVideoUrl) : null
          const adjustedSets = isAdjustedToday ? Math.max(1, Math.round(exercise.sets * volumeMultiplier)) : exercise.sets

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
                    {/* Fixed dark badge over a video thumbnail photo — intentionally not
                        theme-reactive, like a play button overlay on any video platform. */}
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-[#0A0A0B]/60">
                      <Ionicons name="play" size={16} color="#F2E7CF" style={{ marginLeft: 2 }} />
                    </View>
                  </Pressable>
                ) : null}

                <Text className="flex-1 font-display text-base text-ivory">{exercise.displayName}</Text>
              </View>

              <View className="mt-3 flex-row flex-wrap gap-2">
                <Tag
                  label={
                    isAdjustedToday && adjustedSets !== exercise.sets
                      ? `${t('workout.sets')}: ${adjustedSets} (${exercise.sets})`
                      : `${t('workout.sets')}: ${exercise.sets}`
                  }
                />
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
