import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from 'react-native'

import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { pickTranslation } from '@/lib/pick-translation'
import { supabase } from '@/lib/supabase'
import { getYoutubeThumbnail } from '@/lib/youtube-thumbnail'
import { useLanguageStore } from '@/stores/language-store'

type ExerciseRow = { id: string; slug: string; name: string | null; videoUrl: string | null }

export default function ExerciseLibraryScreen() {
  const { t } = useTranslation()
  const language = useLanguageStore(state => state.language)
  const [exercises, setExercises] = useState<ExerciseRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from('exercises')
      .select('id, slug, exercise_translations(language_code, name, video_url)')
      .order('slug')

    const rows: ExerciseRow[] = (data ?? []).map(row => {
      const translations = row.exercise_translations as { language_code: string; name: string; video_url: string | null }[]
      const match = pickTranslation(translations, language)
      return { id: row.id, slug: row.slug, name: match?.name ?? null, videoUrl: match?.video_url ?? null }
    })
    setExercises(rows)
    setIsLoading(false)
  }, [language])

  useEffect(() => {
    load()
  }, [load])

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
      contentContainerClassName="px-5 pb-6 pt-16"
      data={exercises}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <View className="mb-6">
          <View className="flex-row items-center justify-between">
            <Heading>{t('trainer.exerciseLibrary.title')}</Heading>
            <Link href="/(trainer)/exercises/new" asChild>
              <Pressable hitSlop={8} className="active:opacity-60">
                <Text className="font-sans-medium text-sm text-gold">{t('trainer.exerciseLibrary.add')}</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      }
      ListEmptyComponent={<Text className="text-muted">{t('trainer.exerciseLibrary.empty')}</Text>}
      ItemSeparatorComponent={() => <View className="h-3" />}
      renderItem={({ item }) => {
        const thumbnail = item.videoUrl ? getYoutubeThumbnail(item.videoUrl) : null
        return (
          <Link href={{ pathname: '/(trainer)/exercises/[id]', params: { id: item.id } }} asChild>
            <Card>
              <View className="flex-row items-center">
                {item.videoUrl ? (
                  <View className="mr-3 h-14 w-14 items-center justify-center overflow-hidden rounded-md bg-graph">
                    {thumbnail ? (
                      <Image source={{ uri: thumbnail }} className="absolute h-14 w-14" resizeMode="cover" />
                    ) : null}
                    <View className="h-7 w-7 items-center justify-center rounded-full bg-coal/60">
                      <Ionicons name="play" size={14} color="#F2E7CF" style={{ marginLeft: 1.5 }} />
                    </View>
                  </View>
                ) : null}
                <View className="flex-1">
                  <Text className="font-display text-base text-ivory">{item.name ?? item.slug}</Text>
                  <Text className="mt-1 text-xs text-muted">{item.slug}</Text>
                </View>
              </View>
            </Card>
          </Link>
        )
      }}
    />
  )
}
