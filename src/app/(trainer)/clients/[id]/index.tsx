import { Link, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'

import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [client, setClient] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setClient(data)
        setIsLoading(false)
      })
  }, [id])

  if (isLoading || !client) {
    return (
      <View className="flex-1 items-center justify-center bg-coal">
        <ActivityIndicator color="#D2A85E" />
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-coal" contentContainerClassName="px-5 py-6">
      <Heading underline className="mb-8">
        {client.full_name}
      </Heading>

      <Link href={{ pathname: '/(trainer)/clients/[id]/workout-builder', params: { id: client.id } }} asChild>
        <Card className="mb-3">
          <Text className="font-display text-base text-ivory">Vytvořit trénink</Text>
        </Card>
      </Link>

      <Link href={{ pathname: '/(trainer)/clients/[id]/nutrition-builder', params: { id: client.id } }} asChild>
        <Card className="mb-3">
          <Text className="font-display text-base text-ivory">Vytvořit jídelníček</Text>
        </Card>
      </Link>

      <Link href={{ pathname: '/(trainer)/clients/[id]/checkins', params: { id: client.id } }} asChild>
        <Card>
          <Text className="font-display text-base text-ivory">Zobrazit check-iny</Text>
        </Card>
      </Link>
    </ScrollView>
  )
}
