import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native'

import { Card } from '@/components/ui/card'
import { Eyebrow, Heading } from '@/components/ui/heading'
import { MacroRings } from '@/components/ui/macro-rings'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { Meal, MealItem, NutritionPlan } from '@/types/database'

const MACRO_COLORS = { kcal: '#4A90E2', protein: '#4CD97B', carbs: '#F5A623', fat: '#E91E8C' }

type MealWithItems = Meal & { meal_items: MealItem[] }

export default function NutritionScreen() {
  const { t } = useTranslation()
  const profile = useAuthStore(state => state.profile)
  const [plan, setPlan] = useState<NutritionPlan | null>(null)
  const [meals, setMeals] = useState<MealWithItems[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadPlan = useCallback(async () => {
    if (!profile) return
    setIsLoading(true)

    const { data: planData } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('client_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setPlan(planData)

    if (planData) {
      const { data: mealsData } = await supabase
        .from('meals')
        .select('*, meal_items(*)')
        .eq('nutrition_plan_id', planData.id)
        .order('order_index', { ascending: true })

      setMeals((mealsData as MealWithItems[]) ?? [])
    } else {
      setMeals([])
    }

    setIsLoading(false)
  }, [profile])

  useEffect(() => {
    loadPlan()
  }, [loadPlan])

  const totals = meals
    .flatMap(meal => meal.meal_items)
    .reduce(
      (acc, item) => ({
        kcal: acc.kcal + item.kcal,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    )

  return (
    <ScrollView
      className="flex-1 bg-coal"
      contentContainerClassName="px-5 pb-10 pt-16"
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadPlan} tintColor="#D2A85E" />}
    >
      {isLoading ? (
        <ActivityIndicator color="#D2A85E" />
      ) : !plan ? (
        <Text className="text-muted">{t('nutrition.empty')}</Text>
      ) : (
        <>
          <Heading className="mb-4">{plan.title}</Heading>

          {!profile?.date_of_birth || !profile?.height_cm ? (
            <View className="mb-4 rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2.5">
              <Text className="text-sm leading-5 text-amber-400">{t('nutrition.estimatedTargetsNotice')}</Text>
            </View>
          ) : null}

          <Card className="mb-6 flex-row items-center justify-between">
            <View className="gap-3">
              <MacroRow color={MACRO_COLORS.kcal} label={t('nutrition.kcal')} value={totals.kcal} target={plan.target_kcal} unit="kcal" />
              <MacroRow
                color={MACRO_COLORS.protein}
                label={t('nutrition.protein')}
                value={totals.protein}
                target={plan.target_protein}
                unit="g"
              />
              <MacroRow color={MACRO_COLORS.carbs} label={t('nutrition.carbs')} value={totals.carbs} target={plan.target_carbs} unit="g" />
              <MacroRow color={MACRO_COLORS.fat} label={t('nutrition.fat')} value={totals.fat} target={plan.target_fat} unit="g" />
            </View>

            <MacroRings
              rings={[
                { value: totals.kcal, target: plan.target_kcal, color: MACRO_COLORS.kcal },
                { value: totals.protein, target: plan.target_protein, color: MACRO_COLORS.protein },
                { value: totals.carbs, target: plan.target_carbs, color: MACRO_COLORS.carbs },
                { value: totals.fat, target: plan.target_fat, color: MACRO_COLORS.fat },
              ]}
            />
          </Card>

          {meals.map(meal => (
            <View key={meal.id} className="mb-4">
              <Eyebrow className="mb-2">{meal.name}</Eyebrow>
              <Card>
                {meal.meal_items.map((item, index) => (
                  <View
                    key={item.id}
                    className={`flex-row items-center justify-between py-2 ${index > 0 ? 'border-t border-border-soft' : ''}`}
                  >
                    <View>
                      <Text className="text-ivory">{item.name}</Text>
                      {item.amount ? <Text className="text-xs text-muted">{item.amount}</Text> : null}
                    </View>
                    <Text className="text-muted">{item.kcal} kcal</Text>
                  </View>
                ))}
              </Card>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  )
}

function MacroRow({
  color,
  label,
  value,
  target,
  unit,
}: {
  color: string
  label: string
  value: number
  target: number
  unit: string
}) {
  return (
    <View>
      <View className="flex-row items-center gap-1.5">
        <Text className="text-xs text-muted">{label}</Text>
      </View>
      <Text className="font-display-medium text-sm text-ivory">
        {value.toFixed(0)}/{target}
        {unit}
      </Text>
      <View className="mt-1 h-[3px] w-14 rounded-full" style={{ backgroundColor: color }} />
    </View>
  )
}
