import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { Workout, WorkoutExercise } from '@/types/database'

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const profile = useAuthStore(state => state.profile)
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [exercises, setExercises] = useState<WorkoutExercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLogging, setIsLogging] = useState(false)

  const loadWorkout = useCallback(async () => {
    setIsLoading(true)
    const [{ data: workoutData }, { data: exerciseData }] = await Promise.all([
      supabase.from('workouts').select('*').eq('id', id).single(),
      supabase.from('workout_exercises').select('*').eq('workout_id', id).order('order_index', { ascending: true }),
    ])

    setWorkout(workoutData)
    setExercises(exerciseData ?? [])
    setIsLoading(false)
  }, [id])

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
      Alert.alert('Chyba', 'Trénink se nepodařilo zalogovat')
    } else {
      Alert.alert('Hotovo', 'Trénink byl zalogován')
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
        <Text className="mb-4 font-display-bold text-xl uppercase tracking-[1px] text-ivory">{workout.title}</Text>

        {exercises.map(exercise => (
          <Card key={exercise.id} className="mb-3">
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 pr-2 font-display text-base text-ivory">{exercise.name}</Text>
              {exercise.video_url ? (
                <Pressable onPress={() => Linking.openURL(exercise.video_url!)} className="rounded-full bg-gold-50 px-3 py-1">
                  <Text className="font-display-medium text-[10px] uppercase tracking-[1px] text-gold">Video</Text>
                </Pressable>
              ) : null}
            </View>

            <View className="mt-3 flex-row flex-wrap gap-2">
              <Tag label={`Sets: ${exercise.sets}`} />
              <Tag label={`Reps: ${exercise.reps}`} />
              {exercise.rest_seconds ? <Tag label={`Rest: ${exercise.rest_seconds}s`} /> : null}
              {exercise.tempo ? <Tag label={`Tempo: ${exercise.tempo}`} /> : null}
            </View>

            {exercise.notes ? <Text className="mt-3 text-sm text-muted">{exercise.notes}</Text> : null}
          </Card>
        ))}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-coal px-5 pb-8 pt-3">
        <Button label={isLogging ? 'Ukládám…' : 'Log This Workout'} onPress={handleLogWorkout} isLoading={isLogging} />
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
