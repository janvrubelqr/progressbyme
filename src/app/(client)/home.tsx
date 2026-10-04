import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'

import { BloodPressureTracker } from '@/components/ui/blood-pressure-tracker'
import { Card } from '@/components/ui/card'
import { Eyebrow } from '@/components/ui/heading'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { SignOutButton } from '@/components/ui/sign-out-button'
import { StepsTracker } from '@/components/ui/steps-tracker'
import { WaterTracker } from '@/components/ui/water-tracker'
import { WeatherCard } from '@/components/ui/weather-card'
import { WeightTracker } from '@/components/ui/weight-tracker'
import { useAuth } from '@/hooks/use-auth'
import { useWeather } from '@/hooks/use-weather'
import { toDateLocale } from '@/lib/date-locale'
import { todayIso } from '@/lib/last-days'
import { pickTranslation } from '@/lib/pick-translation'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguageStore } from '@/stores/language-store'
import type { Workout } from '@/types/database'

type WorkoutRow = Workout & { displayTitle: string }

export default function HomeScreen() {
  const { t } = useTranslation()
  const language = useLanguageStore(state => state.language)
  const profile = useAuthStore(state => state.profile)
  const { handleSignOut } = useAuth()
  const [nextWorkout, setNextWorkout] = useState<WorkoutRow | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const weatherState = useWeather(language)

  const loadData = useCallback(async () => {
    if (!profile) return
    setIsLoading(true)

    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('workouts')
      .select('*, workout_translations(language_code, title)')
      .eq('client_id', profile.id)
      .gte('scheduled_date', today)
      .order('scheduled_date', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (data) {
      const translations = (data.workout_translations ?? []) as { language_code: string; title: string }[]
      setNextWorkout({ ...data, displayTitle: pickTranslation(translations, language)?.title ?? data.title })
    } else {
      setNextWorkout(null)
    }
    setIsLoading(false)
  }, [profile, language])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <ScrollView
      className="flex-1 bg-coal"
      contentContainerClassName="px-5 pb-10"
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor="#D2A85E" />}
    >
      <View className="flex-row flex-wrap items-center justify-end gap-2 pt-16">
        <LanguageSwitcher />
        <Link href="/(client)/profile" asChild>
          <Pressable
            hitSlop={6}
            className="h-9 w-9 items-center justify-center rounded-full border border-border active:opacity-60"
          >
            <Ionicons name="settings-outline" size={16} color="#948C7D" />
          </Pressable>
        </Link>
        <SignOutButton onPress={handleSignOut} />
      </View>

      <Link href="/(client)/profile" asChild>
        <Pressable hitSlop={6} className="mt-4 self-start active:opacity-60">
          <Eyebrow>{t('home.greeting')}</Eyebrow>
          <Text className="mt-1 font-display-bold text-2xl uppercase tracking-[1px] text-ivory">
            {profile?.full_name ?? t('home.namePlaceholder')}
          </Text>
        </Pressable>
      </Link>

      <WeatherCard
        state={weatherState}
        showOutdoorAdvisory={nextWorkout?.scheduled_date === todayIso() && nextWorkout?.category === 'cardio'}
      />

      <Eyebrow className="mb-3 mt-8">{t('home.nextWorkout')}</Eyebrow>
      {isLoading ? (
        <ActivityIndicator color="#D2A85E" className="mt-4" />
      ) : nextWorkout ? (
        <Link href={{ pathname: '/(client)/workout/[id]', params: { id: nextWorkout.id } }} asChild>
          <Card>
            <Text className="font-display-medium text-xs uppercase tracking-[2px] text-muted">
              {nextWorkout.scheduled_date
                ? new Date(nextWorkout.scheduled_date).toLocaleDateString(toDateLocale(language))
                : ''}
            </Text>
            <Text className="mt-2 font-display text-lg text-ivory">{nextWorkout.displayTitle}</Text>
          </Card>
        </Link>
      ) : (
        <Card>
          <Text className="text-muted">{t('home.noWorkout')}</Text>
        </Card>
      )}

      <View className="mt-6 flex-col gap-3 sm:flex-row">
        <Link href="/(client)/nutrition" asChild>
          <Card className="sm:flex-1">
            <Text className="font-display text-base text-ivory">{t('home.nutritionCardTitle')}</Text>
            <Text className="mt-1 text-sm text-muted">{t('home.nutritionCardSubtitle')}</Text>
          </Card>
        </Link>
        <Link href="/(client)/checkin" asChild>
          <Card className="sm:flex-1">
            <Text className="font-display text-base text-ivory">{t('home.checkinCardTitle')}</Text>
            <Text className="mt-1 text-sm text-muted">{t('home.checkinCardSubtitle')}</Text>
          </Card>
        </Link>
      </View>

      <Eyebrow className="mb-3 mt-8">{t('home.progress')}</Eyebrow>
      <View className="flex-col gap-3 sm:flex-row">
        <Card className="sm:flex-1">
          <WeightTracker />
        </Card>
        <Card className="sm:flex-1">
          <StepsTracker />
        </Card>
      </View>

      <View className="mt-3 flex-col gap-3 sm:flex-row">
        <Card className="sm:flex-1">
          <WaterTracker weather={weatherState.status === 'ready' ? weatherState.data.current : weatherState.status === 'loading' ? undefined : null} />
        </Card>
        <Card className="sm:flex-1">
          <BloodPressureTracker />
        </Card>
      </View>
    </ScrollView>
  )
}
