import { Link } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Text, View } from 'react-native'

import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { Workout } from '@/types/database'

export default function WorkoutListScreen() {
  const profile = useAuthStore(state => state.profile)
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadWorkouts = useCallback(async () => {
    if (!profile) return
    setIsLoading(true)
    const { data } = await supabase
      .from('workouts')
      .select('*')
      .eq('client_id', profile.id)
      .order('scheduled_date', { ascending: false })

    setWorkouts(data ?? [])
    setIsLoading(false)
  }, [profile])

  useEffect(() => {
    loadWorkouts()
  }, [loadWorkouts])

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-coal">
        <ActivityIndicator color="#D2A85E" />
      </View>
    )
  }

  return (
    <FlatList
      className="flex-1 bg-coal"
      contentContainerClassName="px-5 pb-10 pt-16"
      data={workouts}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <Heading underline className="mb-6">
          Tréninky
        </Heading>
      }
      ListEmptyComponent={<Text className="text-muted">Zatím žádné tréninky</Text>}
      ItemSeparatorComponent={() => <View className="h-3" />}
      renderItem={({ item }) => (
        <Link href={{ pathname: '/(client)/workout/[id]', params: { id: item.id } }} asChild>
          <Card>
            <Text className="font-display-medium text-xs uppercase tracking-[2px] text-muted">
              {item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString('cs-CZ') : ''}
            </Text>
            <Text className="mt-2 font-display text-lg text-ivory">{item.title}</Text>
          </Card>
        </Link>
      )}
    />
  )
}
