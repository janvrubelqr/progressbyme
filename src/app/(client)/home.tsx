import { Link } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native'

import { Card } from '@/components/ui/card'
import { Eyebrow } from '@/components/ui/heading'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { Workout } from '@/types/database'

export default function HomeScreen() {
  const profile = useAuthStore(state => state.profile)
  const [nextWorkout, setNextWorkout] = useState<Workout | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!profile) return
    setIsLoading(true)

    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('workouts')
      .select('*')
      .eq('client_id', profile.id)
      .gte('scheduled_date', today)
      .order('scheduled_date', { ascending: true })
      .limit(1)
      .maybeSingle()

    setNextWorkout(data)
    setIsLoading(false)
  }, [profile])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <ScrollView
      className="flex-1 bg-coal"
      contentContainerClassName="px-5 pb-10"
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor="#D2A85E" />}
    >
      <View className="pb-2 pt-16">
        <Eyebrow>Ahoj</Eyebrow>
        <Text className="mt-1 font-display-bold text-2xl uppercase tracking-[1px] text-ivory">
          {profile?.full_name ?? 'sportovče'}
        </Text>
      </View>

      <Eyebrow className="mb-3 mt-8">Tvůj další trénink</Eyebrow>
      {isLoading ? (
        <ActivityIndicator color="#D2A85E" className="mt-4" />
      ) : nextWorkout ? (
        <Link href={{ pathname: '/(client)/workout/[id]', params: { id: nextWorkout.id } }} asChild>
          <Card>
            <Text className="font-display-medium text-xs uppercase tracking-[2px] text-muted">
              {nextWorkout.scheduled_date ? new Date(nextWorkout.scheduled_date).toLocaleDateString('cs-CZ') : ''}
            </Text>
            <Text className="mt-2 font-display text-lg text-ivory">{nextWorkout.title}</Text>
          </Card>
        </Link>
      ) : (
        <Card>
          <Text className="text-muted">Zatím nemáš naplánovaný trénink</Text>
        </Card>
      )}

      <View className="mt-6 flex-row gap-3">
        <Link href="/(client)/nutrition" asChild>
          <Card className="flex-1">
            <Text className="font-display text-base text-ivory">Jídelníček</Text>
            <Text className="mt-1 text-sm text-muted">Dnešní makra</Text>
          </Card>
        </Link>
        <Link href="/(client)/checkin" asChild>
          <Card className="flex-1">
            <Text className="font-display text-base text-ivory">Check-in</Text>
            <Text className="mt-1 text-sm text-muted">Odeslat týdenní</Text>
          </Card>
        </Link>
      </View>
    </ScrollView>
  )
}
