import { Link, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'

import { Card } from '@/components/ui/card'
import { Eyebrow, Heading } from '@/components/ui/heading'
import { calculateAge } from '@/lib/age'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

export default function ClientDetailScreen() {
  const { t } = useTranslation()
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

  const sexLabels: Record<string, string> = {
    male: t('profile.sexMale'),
    female: t('profile.sexFemale'),
    other: t('profile.sexOther'),
  }
  const goalLabels: Record<string, string> = {
    lose_weight: t('profile.goalLoseWeight'),
    gain_muscle: t('profile.goalGainMuscle'),
    maintain: t('profile.goalMaintain'),
    improve_endurance: t('profile.goalImproveEndurance'),
  }
  const activityLabels: Record<string, string> = {
    sedentary: t('profile.activitySedentary'),
    light: t('profile.activityLight'),
    moderate: t('profile.activityModerate'),
    active: t('profile.activityActive'),
    very_active: t('profile.activityVeryActive'),
  }

  const hasProfileInfo =
    client.date_of_birth ||
    client.sex ||
    client.height_cm ||
    client.fitness_goal ||
    client.activity_level ||
    client.health_conditions ||
    client.dietary_restrictions

  return (
    <ScrollView className="flex-1 bg-coal" contentContainerClassName="px-5 py-6">
      <Heading underline className="mb-8">
        {client.full_name}
      </Heading>

      <Eyebrow className="mb-3">{t('profile.title')}</Eyebrow>
      <Card className="mb-6">
        {hasProfileInfo ? (
          <View className="gap-2">
            {client.date_of_birth || client.sex ? (
              <Text className="text-sm text-ivory">
                {client.date_of_birth ? `${calculateAge(client.date_of_birth)} ${t('profile.ageYears')}` : null}
                {client.date_of_birth && client.sex ? '  ·  ' : null}
                {client.sex ? sexLabels[client.sex] : null}
              </Text>
            ) : null}
            {client.height_cm ? (
              <Text className="text-sm text-ivory">
                {client.height_cm} {t('profile.heightUnit')}
              </Text>
            ) : null}
            {client.fitness_goal ? (
              <Text className="text-sm text-ivory">
                {t('profile.goalLabel')}: {goalLabels[client.fitness_goal]}
              </Text>
            ) : null}
            {client.activity_level ? (
              <Text className="text-sm text-ivory">
                {t('profile.activityLabel')}: {activityLabels[client.activity_level]}
              </Text>
            ) : null}
            {client.health_conditions ? (
              <View>
                <Text className="text-xs uppercase tracking-[1px] text-muted">{t('profile.healthConditionsLabel')}</Text>
                <Text className="mt-1 text-sm text-ivory">{client.health_conditions}</Text>
              </View>
            ) : null}
            {client.dietary_restrictions ? (
              <View>
                <Text className="text-xs uppercase tracking-[1px] text-muted">{t('profile.dietaryRestrictionsLabel')}</Text>
                <Text className="mt-1 text-sm text-ivory">{client.dietary_restrictions}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <Text className="text-sm text-muted">{t('profile.empty')}</Text>
        )}
      </Card>

      <Link href={{ pathname: '/(trainer)/clients/[id]/workout-builder', params: { id: client.id } }} asChild>
        <Card className="mb-3">
          <Text className="font-display text-base text-ivory">{t('trainer.createWorkout')}</Text>
        </Card>
      </Link>

      <Link href={{ pathname: '/(trainer)/clients/[id]/nutrition-builder', params: { id: client.id } }} asChild>
        <Card className="mb-3">
          <Text className="font-display text-base text-ivory">{t('trainer.createNutritionPlan')}</Text>
        </Card>
      </Link>

      <Link href={{ pathname: '/(trainer)/clients/[id]/checkins', params: { id: client.id } }} asChild>
        <Card>
          <Text className="font-display text-base text-ivory">{t('trainer.viewCheckins')}</Text>
        </Card>
      </Link>
    </ScrollView>
  )
}
