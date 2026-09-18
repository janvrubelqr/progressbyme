import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native'

import { Card } from '@/components/ui/card'
import { Eyebrow, Heading } from '@/components/ui/heading'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { Meal, MealItem, NutritionPlan } from '@/types/database'

type MealWithItems = Meal & { meal_items: MealItem[] }

export default function NutritionScreen() {
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
        <Text className="text-muted">Zatím nemáš přiřazený jídelníček</Text>
      ) : (
        <>
          <Heading className="mb-1">{plan.title}</Heading>
          <Text className="mb-6 mt-2 font-display-medium text-sm text-gold">
            {totals.kcal.toFixed(0)}/{plan.target_kcal} kcal
          </Text>

          <Card className="mb-6 flex-row justify-between">
            <Macro label="Protein" value={totals.protein} target={plan.target_protein} />
            <Macro label="Carbs" value={totals.carbs} target={plan.target_carbs} />
            <Macro label="Fat" value={totals.fat} target={plan.target_fat} />
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

function Macro({ label, value, target }: { label: string; value: number; target: number }) {
  return (
    <View className="items-center">
      <Text className="font-display text-base text-gold">
        {value.toFixed(0)}/{target}g
      </Text>
      <Text className="mt-1 font-display-medium text-[10px] uppercase tracking-[1px] text-muted">{label}</Text>
    </View>
  )
}
