import { useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, FlatList, Text, View } from 'react-native'

import { Card } from '@/components/ui/card'
import { toDateLocale } from '@/lib/date-locale'
import { supabase } from '@/lib/supabase'
import { useLanguageStore } from '@/stores/language-store'
import type { CheckIn } from '@/types/database'

export default function ClientCheckInsScreen() {
  const { t } = useTranslation()
  const language = useLanguageStore(state => state.language)
  const { id } = useLocalSearchParams<{ id: string }>()
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('check_ins')
      .select('*')
      .eq('client_id', id)
      .order('submitted_at', { ascending: false })
      .then(({ data }) => {
        setCheckIns(data ?? [])
        setIsLoading(false)
      })
  }, [id])

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
      contentContainerClassName="px-5 py-6"
      data={checkIns}
      keyExtractor={item => item.id}
      ListEmptyComponent={<Text className="text-muted">{t('trainer.checkinsEmpty')}</Text>}
      ItemSeparatorComponent={() => <View className="h-3" />}
      renderItem={({ item }) => (
        <Card>
          <Text className="mb-3 font-display-medium text-xs uppercase tracking-[2px] text-muted">
            {new Date(item.submitted_at).toLocaleDateString(toDateLocale(language))}
          </Text>
          <View className="flex-row flex-wrap gap-4">
            {item.weight != null ? <Stat label={t('trainer.statWeight')} value={`${item.weight} kg`} /> : null}
            {item.sleep_hours != null ? <Stat label={t('trainer.statSleep')} value={`${item.sleep_hours} h`} /> : null}
            {item.water_liters != null ? <Stat label={t('trainer.statWater')} value={`${item.water_liters} L`} /> : null}
            {item.training_rating != null ? (
              <Stat label={t('trainer.statTraining')} value={`${item.training_rating}/10`} />
            ) : null}
            {item.recovery_rating != null ? (
              <Stat label={t('trainer.statRecovery')} value={`${item.recovery_rating}/10`} />
            ) : null}
          </View>
          {item.notes?.cely_tyden ? <Text className="mt-4 text-ivory">{item.notes.cely_tyden}</Text> : null}
        </Card>
      )}
    />
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="font-display-medium text-[10px] uppercase tracking-[1px] text-muted">{label}</Text>
      <Text className="mt-1 font-display text-base text-gold">{value}</Text>
    </View>
  )
}
