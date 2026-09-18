import { Link } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native'

import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { Profile } from '@/types/database'

export default function ClientsListScreen() {
  const profile = useAuthStore(state => state.profile)
  const { handleSignOut } = useAuth()
  const [clients, setClients] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadClients = useCallback(async () => {
    if (!profile) return
    setIsLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('trainer_id', profile.id)
      .order('full_name', { ascending: true })

    setClients(data ?? [])
    setIsLoading(false)
  }, [profile])

  useEffect(() => {
    loadClients()
  }, [loadClients])

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
      data={clients}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <View className="mb-6 flex-row items-center justify-between">
          <Heading>Klienti</Heading>
          <Pressable onPress={handleSignOut}>
            <Text className="font-sans-medium text-sm text-gold">Odhlásit</Text>
          </Pressable>
        </View>
      }
      ListEmptyComponent={<Text className="text-muted">Zatím žádní klienti</Text>}
      ItemSeparatorComponent={() => <View className="h-3" />}
      renderItem={({ item }) => (
        <Link href={{ pathname: '/(trainer)/clients/[id]', params: { id: item.id } }} asChild>
          <Card>
            <Text className="font-display text-lg text-ivory">{item.full_name ?? 'Bez jména'}</Text>
          </Card>
        </Link>
      )}
    />
  )
}
