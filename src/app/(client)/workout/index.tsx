import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, Text, View } from 'react-native'

import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { WORKOUT_CATEGORIES, type WorkoutCategoryTag } from '@/lib/exercise-taxonomy'
import { toDateLocale } from '@/lib/date-locale'
import { pickTranslation } from '@/lib/pick-translation'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguageStore } from '@/stores/language-store'
import type { Workout } from '@/types/database'

type WorkoutRow = Workout & { displayTitle: string }

export default function WorkoutListScreen() {
  const { t } = useTranslation()
  const language = useLanguageStore(state => state.language)
  const profile = useAuthStore(state => state.profile)
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<WorkoutCategoryTag | null>(null)

  const loadWorkouts = useCallback(async () => {
    if (!profile) return
    setIsLoading(true)
    const { data } = await supabase
      .from('workouts')
      .select('*, workout_translations(language_code, title)')
      .eq('client_id', profile.id)
      .order('scheduled_date', { ascending: false })

    const rows: WorkoutRow[] = (data ?? []).map(row => {
      const translations = (row.workout_translations ?? []) as { language_code: string; title: string }[]
      return { ...row, displayTitle: pickTranslation(translations, language)?.title ?? row.title }
    })

    setWorkouts(rows)
    setIsLoading(false)
  }, [profile, language])

  useEffect(() => {
    loadWorkouts()
  }, [loadWorkouts])

  const presentCategories = useMemo(
    () => WORKOUT_CATEGORIES.filter(c => workouts.some(w => w.category === c)),
    [workouts]
  )
  const filteredWorkouts = activeCategory ? workouts.filter(w => w.category === activeCategory) : workouts

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
      data={filteredWorkouts}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <View>
          <View className="mb-6 flex-row items-center justify-between">
            <Heading underline>{t('workout.listTitle')}</Heading>
            {Platform.OS === 'web' ? (
              <Link href="/(client)/form-check" asChild>
                <Pressable className="flex-row items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 active:opacity-60">
                  <Ionicons name="videocam-outline" size={14} color="#D2A85E" />
                  <Text className="font-sans-medium text-xs text-gold">{t('formCheck.entryLink')}</Text>
                </Pressable>
              </Link>
            ) : null}
          </View>
          {presentCategories.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5 -mt-1">
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setActiveCategory(null)}
                  hitSlop={6}
                  className={`min-h-11 justify-center rounded-full border px-3 py-1.5 active:opacity-70 ${
                    activeCategory === null ? 'border-gold bg-gold' : 'border-border bg-graph'
                  }`}
                >
                  <Text className={`font-sans-medium text-xs ${activeCategory === null ? 'text-on-gold' : 'text-ivory'}`}>
                    {t('workout.categoryAll')}
                  </Text>
                </Pressable>
                {presentCategories.map(cat => (
                  <Pressable
                    key={cat}
                    onPress={() => setActiveCategory(cat)}
                    hitSlop={6}
                    className={`min-h-11 justify-center rounded-full border px-3 py-1.5 active:opacity-70 ${
                      activeCategory === cat ? 'border-gold bg-gold' : 'border-border bg-graph'
                    }`}
                  >
                    <Text className={`font-sans-medium text-xs ${activeCategory === cat ? 'text-on-gold' : 'text-ivory'}`}>
                      {t(`workout.categories.${cat}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          ) : null}
        </View>
      }
      ListEmptyComponent={<Text className="text-muted">{t('workout.listEmpty')}</Text>}
      ItemSeparatorComponent={() => <View className="h-3" />}
      renderItem={({ item }) => (
        <Link href={{ pathname: '/(client)/workout/[id]', params: { id: item.id } }} asChild>
          <Card>
            <Text className="font-display-medium text-xs uppercase tracking-[2px] text-muted">
              {item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString(toDateLocale(language)) : ''}
            </Text>
            <Text className="mt-2 font-display text-lg text-ivory">{item.displayTitle}</Text>
          </Card>
        </Link>
      )}
    />
  )
}
