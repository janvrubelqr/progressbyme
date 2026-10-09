import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCoachMessage } from '@/hooks/use-coach-message'
import { useThemeColors } from '@/hooks/use-theme-colors'
import { todayIso } from '@/lib/last-days'
import { pickTranslation } from '@/lib/pick-translation'
import { calculateReadinessScore, readinessCategory, readinessVolumeMultiplier } from '@/lib/readiness'
import { resolveExerciseDisplay, type ResolvedExercise } from '@/lib/resolve-exercise'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguageStore } from '@/stores/language-store'
import { getYoutubeThumbnail } from '@/lib/youtube-thumbnail'
import type { ReadinessLog, Workout } from '@/types/database'

type LibraryExercise = { id: string; name: string }
type ChatMessage = { role: 'user' | 'assistant'; text: string }

export default function WorkoutDetailScreen() {
  const { t } = useTranslation()
  const theme = useThemeColors()
  const language = useLanguageStore(state => state.language)
  const { id } = useLocalSearchParams<{ id: string }>()
  const profile = useAuthStore(state => state.profile)
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [displayTitle, setDisplayTitle] = useState('')
  const [exercises, setExercises] = useState<ResolvedExercise[]>([])
  const [todayReadiness, setTodayReadiness] = useState<ReadinessLog | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLogging, setIsLogging] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [library, setLibrary] = useState<LibraryExercise[]>([])
  const [isPicking, setIsPicking] = useState(false)
  const [exerciseQuery, setExerciseQuery] = useState('')

  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatSending, setIsChatSending] = useState(false)

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

  useEffect(() => {
    supabase
      .from('exercise_translations')
      .select('exercise_id, name')
      .eq('language_code', language)
      .then(({ data }) => setLibrary((data ?? []).map(row => ({ id: row.exercise_id, name: row.name }))))
  }, [language])

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

  const toggleExerciseDone = async (exercise: ResolvedExercise) => {
    const nextValue = exercise.completed_at ? null : new Date().toISOString()
    setExercises(prev => prev.map(e => (e.id === exercise.id ? { ...e, completed_at: nextValue } : e)))
    await supabase.from('workout_exercises').update({ completed_at: nextValue }).eq('id', exercise.id)
  }

  const moveExercise = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= exercises.length) return

    const a = exercises[index]
    const b = exercises[targetIndex]
    const reordered = [...exercises]
    ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
    setExercises(reordered)

    await Promise.all([
      supabase.from('workout_exercises').update({ order_index: b.order_index }).eq('id', a.id),
      supabase.from('workout_exercises').update({ order_index: a.order_index }).eq('id', b.id),
    ])
  }

  const removeExercise = async (exercise: ResolvedExercise) => {
    setExercises(prev => prev.filter(e => e.id !== exercise.id))
    await supabase.from('workout_exercises').delete().eq('id', exercise.id)
  }

  const addExerciseFromLibrary = async (item: LibraryExercise) => {
    if (!workout) return
    setIsPicking(false)
    setExerciseQuery('')

    const nextOrderIndex = exercises.length ? Math.max(...exercises.map(e => e.order_index)) + 1 : 0
    const { data } = await supabase
      .from('workout_exercises')
      .insert({ workout_id: workout.id, exercise_id: item.id, order_index: nextOrderIndex, sets: 3, reps: '10-12' })
      .select()
      .single()

    if (data) {
      const [resolved] = await resolveExerciseDisplay([data], language)
      setExercises(prev => [...prev, resolved])
    }
  }

  const sendChatMessage = async () => {
    const message = chatInput.trim()
    if (!message || !profile || !workout) return

    setChatMessages(prev => [...prev, { role: 'user', text: message }])
    setChatInput('')
    setIsChatSending(true)

    const { data, error } = await supabase.functions.invoke<{ reply: string; changed: boolean }>('workout-chat', {
      body: { workout_id: workout.id, client_id: profile.id, message, language },
    })

    setIsChatSending(false)

    if (error || !data) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: t('workout.chatError') }])
      return
    }

    setChatMessages(prev => [...prev, { role: 'assistant', text: data.reply }])
    if (data.changed) await loadWorkout()
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
  const isTodaysWorkout = workout?.scheduled_date === todayIso()

  // Hooks must run unconditionally (before the loading early-return below),
  // so the "should we even ask the coach" check lives inside the params
  // instead of around the hook call. A coach note shows for any session
  // scheduled today, not just an adjusted one — readiness being fine is
  // still worth a word of encouragement, not silence.
  const { message: coachMessage } = useCoachMessage(
    isTodaysWorkout && !isLoading
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

  const usedExerciseIds = new Set(exercises.map(e => e.exercise_id).filter(Boolean))
  const suggestions = exerciseQuery
    ? library.filter(item => !usedExerciseIds.has(item.id) && item.name.toLowerCase().includes(exerciseQuery.toLowerCase())).slice(0, 8)
    : []

  return (
    <View className="flex-1 bg-coal">
      <ScrollView contentContainerClassName="px-5 pb-28 pt-4">
        <View className="mb-3 flex-row items-start justify-between gap-3">
          <Text className="flex-1 font-display-bold text-xl uppercase tracking-[1px] text-ivory">{displayTitle}</Text>
        </View>

        <View className="mb-4 flex-row flex-wrap gap-2">
          <Pressable
            onPress={() => setIsEditing(v => !v)}
            className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 active:opacity-60 ${
              isEditing ? 'border-gold bg-gold' : 'border-border bg-graph'
            }`}
          >
            <Ionicons name="create-outline" size={14} color={isEditing ? theme.surface : '#D2A85E'} />
            <Text className={`font-sans-medium text-xs ${isEditing ? 'text-on-gold' : 'text-gold'}`}>
              {t(isEditing ? 'workout.editDone' : 'workout.editToggle')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setIsChatOpen(v => !v)}
            className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 active:opacity-60 ${
              isChatOpen ? 'border-gold bg-gold' : 'border-border bg-graph'
            }`}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={isChatOpen ? theme.surface : '#D2A85E'} />
            <Text className={`font-sans-medium text-xs ${isChatOpen ? 'text-on-gold' : 'text-gold'}`}>
              {t('workout.chatToggle')}
            </Text>
          </Pressable>
        </View>

        {isTodaysWorkout ? (
          <View
            className={`mb-4 rounded-md border px-3 py-2.5 ${
              isAdjustedToday ? 'border-amber-400/30 bg-amber-400/10' : 'border-gold/30 bg-gold/10'
            }`}
          >
            <Text className={`text-sm leading-5 ${isAdjustedToday ? 'text-amber-400' : 'text-gold'}`}>
              {coachMessage ?? t(isAdjustedToday ? 'workout.readinessAdjustedNotice' : 'workout.coachDefaultNotice')}
            </Text>
          </View>
        ) : null}

        {isChatOpen ? (
          <Card className="mb-4">
            <Text className="mb-2 font-display-medium text-xs uppercase tracking-[1px] text-gold">
              {t('workout.chatTitle')}
            </Text>

            {chatMessages.length === 0 ? <Text className="mb-3 text-sm text-muted">{t('workout.chatEmpty')}</Text> : null}

            {chatMessages.map((m, i) => (
              <View
                key={i}
                className={`mb-2 max-w-[90%] rounded-md px-3 py-2 ${
                  m.role === 'user' ? 'self-end bg-gold/15' : 'self-start bg-coal'
                }`}
              >
                <Text className={`text-sm leading-5 ${m.role === 'user' ? 'text-gold' : 'text-ivory'}`}>{m.text}</Text>
              </View>
            ))}

            {isChatSending ? (
              <View className="mb-2 flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#D2A85E" />
                <Text className="text-sm text-muted">{t('workout.chatThinking')}</Text>
              </View>
            ) : null}

            <View className="mt-2 flex-row items-center gap-2">
              <TextInput
                value={chatInput}
                onChangeText={setChatInput}
                placeholder={t('workout.chatPlaceholder')}
                placeholderTextColor={theme.placeholder}
                className="flex-1 rounded-md border border-border bg-coal px-3 py-2.5 text-sm text-ivory"
                editable={!isChatSending}
                onSubmitEditing={sendChatMessage}
                returnKeyType="send"
              />
              <Pressable
                onPress={sendChatMessage}
                disabled={!chatInput.trim() || isChatSending}
                hitSlop={8}
                className={`h-10 w-10 items-center justify-center rounded-full bg-gold active:opacity-70 ${
                  !chatInput.trim() || isChatSending ? 'opacity-50' : ''
                }`}
              >
                <Ionicons name="arrow-up" size={18} color={theme.surface} />
              </Pressable>
            </View>
          </Card>
        ) : null}

        {exercises.map((exercise, index) => {
          const thumbnail = exercise.displayVideoUrl ? getYoutubeThumbnail(exercise.displayVideoUrl) : null
          const adjustedSets = isAdjustedToday ? Math.max(1, Math.round(exercise.sets * volumeMultiplier)) : exercise.sets
          const isDone = !!exercise.completed_at

          return (
            <Card key={exercise.id} className={`mb-3 ${isDone ? 'opacity-60' : ''}`}>
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

                <Text className={`flex-1 font-display text-base text-ivory ${isDone ? 'line-through' : ''}`}>
                  {exercise.displayName}
                </Text>

                <Pressable
                  onPress={() => toggleExerciseDone(exercise)}
                  hitSlop={10}
                  className="ml-2 active:opacity-60"
                  testID={`toggle-done-${exercise.id}`}
                >
                  <Ionicons
                    name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                    size={26}
                    color={isDone ? theme.good : theme.mutedSoft}
                  />
                </Pressable>
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

              {isEditing ? (
                <View className="mt-3 flex-row items-center justify-between border-t border-border-soft pt-3">
                  <View className="flex-row items-center gap-4">
                    <Pressable
                      onPress={() => moveExercise(index, -1)}
                      disabled={index === 0}
                      hitSlop={10}
                      className="active:opacity-60"
                      testID={`move-up-${exercise.id}`}
                    >
                      <Ionicons name="chevron-up" size={18} color={index === 0 ? theme.mutedSoft : theme.muted} />
                    </Pressable>
                    <Pressable
                      onPress={() => moveExercise(index, 1)}
                      disabled={index === exercises.length - 1}
                      hitSlop={10}
                      className="active:opacity-60"
                      testID={`move-down-${exercise.id}`}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={18}
                        color={index === exercises.length - 1 ? theme.mutedSoft : theme.muted}
                      />
                    </Pressable>
                  </View>
                  <Pressable onPress={() => removeExercise(exercise)} hitSlop={8} className="active:opacity-60">
                    <Text className="text-sm text-red-400">{t('workout.remove')}</Text>
                  </Pressable>
                </View>
              ) : null}
            </Card>
          )
        })}

        {isEditing ? (
          <View className="mb-4">
            {isPicking ? (
              <View className="mb-2">
                <TextInput
                  value={exerciseQuery}
                  onChangeText={setExerciseQuery}
                  placeholder={t('workout.searchPlaceholder')}
                  placeholderTextColor={theme.placeholder}
                  autoFocus
                  className="rounded-md border border-border bg-graph px-4 py-3 text-base text-ivory"
                />
                {exerciseQuery ? (
                  <View className="mt-2 overflow-hidden rounded-md border border-border bg-graph">
                    {suggestions.length ? (
                      suggestions.map(item => (
                        <Pressable
                          key={item.id}
                          onPress={() => addExerciseFromLibrary(item)}
                          className="min-h-11 justify-center border-b border-border-soft px-3 py-2 last:border-b-0 active:bg-coal"
                        >
                          <Text className="text-sm text-ivory">{item.name}</Text>
                        </Pressable>
                      ))
                    ) : (
                      <Text className="px-3 py-3 text-sm text-muted">{t('workout.noResults')}</Text>
                    )}
                  </View>
                ) : null}
              </View>
            ) : null}
            <Button
              label={t(isPicking ? 'workout.cancelAdd' : 'workout.addExercise')}
              variant="ghost"
              onPress={() => {
                setIsPicking(v => !v)
                setExerciseQuery('')
              }}
            />
          </View>
        ) : null}
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
