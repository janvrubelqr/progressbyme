import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Eyebrow } from '@/components/ui/heading'
import { TextField } from '@/components/ui/text-field'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'

type ExerciseDraft = {
  name: string
  sets: string
  reps: string
  rest_seconds: string
  tempo: string
  video_url: string
  notes: string
}

const emptyExercise: ExerciseDraft = {
  name: '',
  sets: '',
  reps: '',
  rest_seconds: '',
  tempo: '',
  video_url: '',
  notes: '',
}

export default function WorkoutBuilderScreen() {
  const { id: clientId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const trainerProfile = useAuthStore(state => state.profile)

  const [title, setTitle] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [exercises, setExercises] = useState<ExerciseDraft[]>([{ ...emptyExercise }])
  const [isSaving, setIsSaving] = useState(false)

  const updateExercise = (index: number, patch: Partial<ExerciseDraft>) => {
    setExercises(prev => prev.map((exercise, i) => (i === index ? { ...exercise, ...patch } : exercise)))
  }

  const addExercise = () => setExercises(prev => [...prev, { ...emptyExercise }])
  const removeExercise = (index: number) => setExercises(prev => prev.filter((_, i) => i !== index))

  const handleSave = async () => {
    if (!trainerProfile || !title || exercises.every(e => !e.name)) {
      Alert.alert('Chyba', 'Vyplň název tréninku a alespoň jeden cvik')
      return
    }

    setIsSaving(true)

    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        client_id: clientId,
        trainer_id: trainerProfile.id,
        title,
        scheduled_date: scheduledDate || null,
      })
      .select()
      .single()

    if (workoutError || !workout) {
      setIsSaving(false)
      Alert.alert('Chyba', 'Trénink se nepodařilo uložit')
      return
    }

    const rows = exercises
      .filter(e => e.name)
      .map((exercise, index) => ({
        workout_id: workout.id,
        order_index: index,
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
      Alert.alert('Chyba', 'Cviky se nepodařilo uložit')
      return
    }

    Alert.alert('Hotovo', 'Trénink byl vytvořen')
    router.back()
  }

  return (
    <ScrollView className="flex-1 bg-coal" contentContainerClassName="px-5 py-6 pb-16">
      <TextField label="Název tréninku" value={title} onChangeText={setTitle} placeholder="Posilovna" />
      <TextField label="Datum (YYYY-MM-DD)" value={scheduledDate} onChangeText={setScheduledDate} placeholder="2026-09-20" />

      <Eyebrow className="mb-3 mt-4">Cviky</Eyebrow>

      {exercises.map((exercise, index) => (
        <Card key={index} className="mb-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="font-display text-sm text-ivory">Cvik {index + 1}</Text>
            {exercises.length > 1 ? (
              <Pressable onPress={() => removeExercise(index)}>
                <Text className="text-sm text-red-400">Odebrat</Text>
              </Pressable>
            ) : null}
          </View>

          <TextField label="Název" value={exercise.name} onChangeText={v => updateExercise(index, { name: v })} />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextField label="Sets" value={exercise.sets} onChangeText={v => updateExercise(index, { sets: v })} keyboardType="number-pad" />
            </View>
            <View className="flex-1">
              <TextField label="Reps" value={exercise.reps} onChangeText={v => updateExercise(index, { reps: v })} placeholder="8-12" />
            </View>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextField
                label="Rest (s)"
                value={exercise.rest_seconds}
                onChangeText={v => updateExercise(index, { rest_seconds: v })}
                keyboardType="number-pad"
              />
            </View>
            <View className="flex-1">
              <TextField label="Tempo" value={exercise.tempo} onChangeText={v => updateExercise(index, { tempo: v })} placeholder="3-1-1-2" />
            </View>
          </View>
          <TextField label="Video URL" value={exercise.video_url} onChangeText={v => updateExercise(index, { video_url: v })} />
          <TextField label="Poznámka" value={exercise.notes} onChangeText={v => updateExercise(index, { notes: v })} containerClassName="mb-0" />
        </Card>
      ))}

      <Button label="+ Přidat cvik" variant="ghost" onPress={addExercise} className="mb-6" />
      <Button label="Uložit trénink" onPress={handleSave} isLoading={isSaving} />
    </ScrollView>
  )
}
