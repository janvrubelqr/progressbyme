import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Eyebrow } from '@/components/ui/heading'
import { TextField } from '@/components/ui/text-field'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { Food } from '@/types/database'

type ItemDraft = {
  foodId: string | null
  name: string
  amount: string
  kcal: string
  protein: string
  carbs: string
  fat: string
}
type MealDraft = { name: string; items: ItemDraft[] }

const emptyItem: ItemDraft = { foodId: null, name: '', amount: '', kcal: '', protein: '', carbs: '', fat: '' }
const emptyMeal = (): MealDraft => ({ name: '', items: [{ ...emptyItem }] })

const round1 = (n: number) => Math.round(n * 10) / 10

export default function NutritionBuilderScreen() {
  const { t } = useTranslation()
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
  const [foods, setFoods] = useState<Food[]>([])
  const [suggestionsFor, setSuggestionsFor] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('foods')
      .select('id, name, kcal_100g, protein_100g, carbs_100g, fat_100g')
      .order('name')
      .then(({ data }) => setFoods(data ?? []))
  }, [])

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

  const macrosFromFood = (food: Food, amountText: string): Partial<ItemDraft> | null => {
    const grams = Number(amountText.replace(/[^0-9.]/g, ''))
    if (!grams) return null
    return {
      kcal: String(Math.round((food.kcal_100g * grams) / 100)),
      protein: String(round1((food.protein_100g * grams) / 100)),
      carbs: String(round1((food.carbs_100g * grams) / 100)),
      fat: String(round1((food.fat_100g * grams) / 100)),
    }
  }

  const handleItemNameChange = (mealIndex: number, itemIndex: number, value: string) => {
    updateItem(mealIndex, itemIndex, { name: value, foodId: null })
    setSuggestionsFor(value ? `${mealIndex}-${itemIndex}` : null)
  }

  const pickFood = (mealIndex: number, itemIndex: number, food: Food) => {
    const currentAmount = meals[mealIndex].items[itemIndex].amount
    const computed = macrosFromFood(food, currentAmount)
    updateItem(mealIndex, itemIndex, { name: food.name, foodId: food.id, ...(computed ?? {}) })
    setSuggestionsFor(null)
  }

  const handleItemAmountChange = (mealIndex: number, itemIndex: number, value: string) => {
    const item = meals[mealIndex].items[itemIndex]
    const food = item.foodId ? foods.find(f => f.id === item.foodId) : null
    const computed = food ? macrosFromFood(food, value) : null
    updateItem(mealIndex, itemIndex, { amount: value, ...(computed ?? {}) })
  }

  const handleSave = async () => {
    if (!trainerProfile || !title) {
      Alert.alert(t('trainer.nutritionBuilder.title'), t('trainer.nutritionBuilder.validationError'))
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
      Alert.alert(t('trainer.nutritionBuilder.title'), t('trainer.nutritionBuilder.saveError'))
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
          food_id: item.foodId,
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
    Alert.alert(t('trainer.nutritionBuilder.saveSuccessTitle'), t('trainer.nutritionBuilder.saveSuccess'))
    router.back()
  }

  return (
    <ScrollView className="flex-1 bg-coal" contentContainerClassName="px-5 py-6 pb-16">
      <TextField
        label={t('trainer.nutritionBuilder.planTitleLabel')}
        value={title}
        onChangeText={setTitle}
        placeholder={t('trainer.nutritionBuilder.planTitlePlaceholder')}
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <TextField label={t('trainer.nutritionBuilder.kcalLabel')} value={targetKcal} onChangeText={setTargetKcal} keyboardType="number-pad" />
        </View>
        <View className="flex-1">
          <TextField
            label={t('trainer.nutritionBuilder.proteinLabel')}
            value={targetProtein}
            onChangeText={setTargetProtein}
            keyboardType="number-pad"
          />
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <TextField
            label={t('trainer.nutritionBuilder.carbsLabel')}
            value={targetCarbs}
            onChangeText={setTargetCarbs}
            keyboardType="number-pad"
          />
        </View>
        <View className="flex-1">
          <TextField label={t('trainer.nutritionBuilder.fatLabel')} value={targetFat} onChangeText={setTargetFat} keyboardType="number-pad" />
        </View>
      </View>

      <Eyebrow className="mb-3 mt-4">{t('trainer.nutritionBuilder.mealsLabel')}</Eyebrow>

      {meals.map((meal, mealIndex) => (
        <Card key={mealIndex} className="mb-4">
          <View className="mb-2 flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <TextField
                label={t('trainer.nutritionBuilder.mealNameLabel')}
                value={meal.name}
                onChangeText={v => updateMeal(mealIndex, v)}
                placeholder={t('trainer.nutritionBuilder.mealNamePlaceholder')}
                containerClassName="mb-0"
              />
            </View>
            {meals.length > 1 ? (
              <Pressable onPress={() => removeMeal(mealIndex)} hitSlop={8} className="pt-6 active:opacity-60">
                <Text className="text-sm text-red-400">{t('trainer.nutritionBuilder.remove')}</Text>
              </Pressable>
            ) : null}
          </View>

          {meal.items.map((item, itemIndex) => (
            <View key={itemIndex} className="mb-2 mt-3 rounded-md border border-border-soft bg-coal p-3">
              <View className="flex-row items-center justify-between">
                <Text className="font-sans-medium text-xs uppercase tracking-[1px] text-muted">
                  {t('trainer.nutritionBuilder.itemTitle', { n: itemIndex + 1 })}
                </Text>
                {meal.items.length > 1 ? (
                  <Pressable onPress={() => removeItem(mealIndex, itemIndex)} hitSlop={8} className="active:opacity-60">
                    <Text className="text-xs text-red-400">{t('trainer.nutritionBuilder.remove')}</Text>
                  </Pressable>
                ) : null}
              </View>
              {(() => {
                const itemKey = `${mealIndex}-${itemIndex}`
                const suggestions =
                  suggestionsFor === itemKey
                    ? foods.filter(f => f.name.toLowerCase().includes(item.name.toLowerCase())).slice(0, 5)
                    : []
                return (
                  <>
                    <TextField
                      label={t('trainer.nutritionBuilder.itemNameLabel')}
                      value={item.name}
                      onChangeText={v => handleItemNameChange(mealIndex, itemIndex, v)}
                      onFocus={() => setSuggestionsFor(item.name ? itemKey : null)}
                      onBlur={() => setTimeout(() => setSuggestionsFor(null), 150)}
                      containerClassName={suggestions.length ? 'mb-0' : undefined}
                    />
                    {suggestions.length ? (
                      <View className="mb-4 overflow-hidden rounded-md border border-border bg-graph">
                        {suggestions.map(food => (
                          <Pressable
                            key={food.id}
                            onPress={() => pickFood(mealIndex, itemIndex, food)}
                            className="min-h-11 justify-center border-b border-border-soft px-3 py-2 last:border-b-0 active:bg-coal"
                          >
                            <Text className="text-sm text-ivory">{food.name}</Text>
                            <Text className="text-xs text-muted">
                              {food.kcal_100g} kcal / 100 g
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </>
                )
              })()}
              <TextField
                label={t('trainer.nutritionBuilder.amountLabel')}
                value={item.amount}
                onChangeText={v => handleItemAmountChange(mealIndex, itemIndex, v)}
                placeholder={t('trainer.nutritionBuilder.amountPlaceholder')}
                keyboardType={item.foodId ? 'number-pad' : 'default'}
              />
              {item.foodId ? (
                <Text className="-mt-3 mb-3 text-xs text-muted">{t('trainer.nutritionBuilder.foodLinkedHint')}</Text>
              ) : null}
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <TextField
                    label={t('trainer.nutritionBuilder.itemKcalLabel')}
                    value={item.kcal}
                    onChangeText={v => updateItem(mealIndex, itemIndex, { kcal: v })}
                    keyboardType="number-pad"
                  />
                </View>
                <View className="flex-1">
                  <TextField
                    label={t('trainer.nutritionBuilder.itemProteinLabel')}
                    value={item.protein}
                    onChangeText={v => updateItem(mealIndex, itemIndex, { protein: v })}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <TextField
                    label={t('trainer.nutritionBuilder.itemCarbsLabel')}
                    value={item.carbs}
                    onChangeText={v => updateItem(mealIndex, itemIndex, { carbs: v })}
                    keyboardType="number-pad"
                  />
                </View>
                <View className="flex-1">
                  <TextField
                    label={t('trainer.nutritionBuilder.itemFatLabel')}
                    value={item.fat}
                    onChangeText={v => updateItem(mealIndex, itemIndex, { fat: v })}
                    keyboardType="number-pad"
                    containerClassName="mb-0"
                  />
                </View>
              </View>
            </View>
          ))}

          <Button
            label={t('trainer.nutritionBuilder.addItem')}
            variant="ghost"
            onPress={() => addItem(mealIndex)}
            className="mt-3 py-2"
          />
        </Card>
      ))}

      <Button label={t('trainer.nutritionBuilder.addMeal')} variant="ghost" onPress={addMeal} className="mb-6" />
      <Button label={t('trainer.nutritionBuilder.save')} onPress={handleSave} isLoading={isSaving} />
    </ScrollView>
  )
}
