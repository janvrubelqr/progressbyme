import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Eyebrow } from '@/components/ui/heading'
import { TextField } from '@/components/ui/text-field'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'

type ItemDraft = { name: string; amount: string; kcal: string; protein: string; carbs: string; fat: string }
type MealDraft = { name: string; items: ItemDraft[] }

const emptyItem: ItemDraft = { name: '', amount: '', kcal: '', protein: '', carbs: '', fat: '' }
const emptyMeal = (): MealDraft => ({ name: '', items: [{ ...emptyItem }] })

export default function NutritionBuilderScreen() {
  const { id: clientId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const trainerProfile = useAuthStore(state => state.profile)

  const [title, setTitle] = useState('')
  const [targetKcal, setTargetKcal] = useState('')
  const [targetProtein, setTargetProtein] = useState('')
  const [targetCarbs, setTargetCarbs] = useState('')
  const [targetFat, setTargetFat] = useState('')
  const [meals, setMeals] = useState<MealDraft[]>([emptyMeal()])
  const [isSaving, setIsSaving] = useState(false)

  const updateMeal = (index: number, name: string) =>
    setMeals(prev => prev.map((meal, i) => (i === index ? { ...meal, name } : meal)))

  const addMeal = () => setMeals(prev => [...prev, emptyMeal()])
  const removeMeal = (index: number) => setMeals(prev => prev.filter((_, i) => i !== index))

  const updateItem = (mealIndex: number, itemIndex: number, patch: Partial<ItemDraft>) =>
    setMeals(prev =>
      prev.map((meal, i) =>
        i === mealIndex
          ? { ...meal, items: meal.items.map((item, j) => (j === itemIndex ? { ...item, ...patch } : item)) }
          : meal
      )
    )

  const addItem = (mealIndex: number) =>
    setMeals(prev => prev.map((meal, i) => (i === mealIndex ? { ...meal, items: [...meal.items, { ...emptyItem }] } : meal)))

  const removeItem = (mealIndex: number, itemIndex: number) =>
    setMeals(prev =>
      prev.map((meal, i) => (i === mealIndex ? { ...meal, items: meal.items.filter((_, j) => j !== itemIndex) } : meal))
    )

  const handleSave = async () => {
    if (!trainerProfile || !title) {
      Alert.alert('Chyba', 'Vyplň název jídelníčku')
      return
    }

    setIsSaving(true)

    const { data: plan, error: planError } = await supabase
      .from('nutrition_plans')
      .insert({
        client_id: clientId,
        trainer_id: trainerProfile.id,
        title,
        target_kcal: Number(targetKcal) || 0,
        target_protein: Number(targetProtein) || 0,
        target_carbs: Number(targetCarbs) || 0,
        target_fat: Number(targetFat) || 0,
      })
      .select()
      .single()

    if (planError || !plan) {
      setIsSaving(false)
      Alert.alert('Chyba', 'Jídelníček se nepodařilo uložit')
      return
    }

    for (const [mealIndex, meal] of meals.entries()) {
      if (!meal.name) continue

      const { data: mealRow, error: mealError } = await supabase
        .from('meals')
        .insert({ nutrition_plan_id: plan.id, name: meal.name, order_index: mealIndex })
        .select()
        .single()

      if (mealError || !mealRow) continue

      const itemRows = meal.items
        .filter(item => item.name)
        .map(item => ({
          meal_id: mealRow.id,
          name: item.name,
          amount: item.amount || null,
          kcal: Number(item.kcal) || 0,
          protein: Number(item.protein) || 0,
          carbs: Number(item.carbs) || 0,
          fat: Number(item.fat) || 0,
        }))

      if (itemRows.length) {
        await supabase.from('meal_items').insert(itemRows)
      }
    }

    setIsSaving(false)
    Alert.alert('Hotovo', 'Jídelníček byl vytvořen')
    router.back()
  }

  return (
    <ScrollView className="flex-1 bg-coal" contentContainerClassName="px-5 py-6 pb-16">
      <TextField label="Název jídelníčku" value={title} onChangeText={setTitle} placeholder="2500 kcal + potrénink" />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <TextField label="Kcal" value={targetKcal} onChangeText={setTargetKcal} keyboardType="number-pad" />
        </View>
        <View className="flex-1">
          <TextField label="Protein (g)" value={targetProtein} onChangeText={setTargetProtein} keyboardType="number-pad" />
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <TextField label="Carbs (g)" value={targetCarbs} onChangeText={setTargetCarbs} keyboardType="number-pad" />
        </View>
        <View className="flex-1">
          <TextField label="Fat (g)" value={targetFat} onChangeText={setTargetFat} keyboardType="number-pad" />
        </View>
      </View>

      <Eyebrow className="mb-3 mt-4">Jídla</Eyebrow>

      {meals.map((meal, mealIndex) => (
        <Card key={mealIndex} className="mb-4">
          <View className="mb-2 flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <TextField label="Název jídla" value={meal.name} onChangeText={v => updateMeal(mealIndex, v)} placeholder="Snídaně vejce" containerClassName="mb-0" />
            </View>
            {meals.length > 1 ? (
              <Pressable onPress={() => removeMeal(mealIndex)} className="pt-6">
                <Text className="text-sm text-red-400">Odebrat</Text>
              </Pressable>
            ) : null}
          </View>

          {meal.items.map((item, itemIndex) => (
            <View key={itemIndex} className="mb-2 mt-3 rounded-md border border-border-soft bg-coal p-3">
              <View className="flex-row items-center justify-between">
                <Text className="font-sans-medium text-xs uppercase tracking-[1px] text-muted">Položka {itemIndex + 1}</Text>
                {meal.items.length > 1 ? (
                  <Pressable onPress={() => removeItem(mealIndex, itemIndex)}>
                    <Text className="text-xs text-red-400">Odebrat</Text>
                  </Pressable>
                ) : null}
              </View>
              <TextField label="Název" value={item.name} onChangeText={v => updateItem(mealIndex, itemIndex, { name: v })} />
              <TextField label="Množství" value={item.amount} onChangeText={v => updateItem(mealIndex, itemIndex, { amount: v })} placeholder="100 g" />
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <TextField label="Kcal" value={item.kcal} onChangeText={v => updateItem(mealIndex, itemIndex, { kcal: v })} keyboardType="number-pad" />
                </View>
                <View className="flex-1">
                  <TextField label="Protein" value={item.protein} onChangeText={v => updateItem(mealIndex, itemIndex, { protein: v })} keyboardType="number-pad" />
                </View>
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <TextField label="Carbs" value={item.carbs} onChangeText={v => updateItem(mealIndex, itemIndex, { carbs: v })} keyboardType="number-pad" />
                </View>
                <View className="flex-1">
                  <TextField
                    label="Fat"
                    value={item.fat}
                    onChangeText={v => updateItem(mealIndex, itemIndex, { fat: v })}
                    keyboardType="number-pad"
                    containerClassName="mb-0"
                  />
                </View>
              </View>
            </View>
          ))}

          <Button label="+ Přidat položku" variant="ghost" onPress={() => addItem(mealIndex)} className="mt-3 py-2" />
        </Card>
      ))}

      <Button label="+ Přidat jídlo" variant="ghost" onPress={addMeal} className="mb-6" />
      <Button label="Uložit jídelníček" onPress={handleSave} isLoading={isSaving} />
    </ScrollView>
  )
}
