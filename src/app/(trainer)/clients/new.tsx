import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { ChipSelect } from '@/components/ui/chip-select'
import { Heading } from '@/components/ui/heading'
import { MessageBanner, type Message } from '@/components/ui/message-banner'
import { TextField } from '@/components/ui/text-field'
import { decimalDigitsOnly, digitsOnly } from '@/lib/digits-only'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { FitnessGoal, Sex } from '@/types/database'

export default function AddClientScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const trainerProfile = useAuthStore(state => state.profile)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [sex, setSex] = useState<Sex | null>(null)
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | null>(null)
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)

  const sexOptions: { value: Sex; label: string }[] = [
    { value: 'male', label: t('profile.sexMale') },
    { value: 'female', label: t('profile.sexFemale') },
    { value: 'other', label: t('profile.sexOther') },
  ]

  const goalOptions: { value: FitnessGoal; label: string }[] = [
    { value: 'lose_weight', label: t('profile.goalLoseWeight') },
    { value: 'gain_muscle', label: t('profile.goalGainMuscle') },
    { value: 'maintain', label: t('profile.goalMaintain') },
    { value: 'improve_endurance', label: t('profile.goalImproveEndurance') },
  ]

  const handleSave = async () => {
    if (!trainerProfile) return
    setMessage(null)

    if (!fullName.trim() || !email.trim()) {
      setMessage({ type: 'error', text: t('trainer.addClient.validationError') })
      return
    }

    setIsSaving(true)

    const { data, error } = await supabase
      .from('client_intake')
      .insert({
        trainer_id: trainerProfile.id,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        age: age ? Number(age) : null,
        weight_kg: weightKg ? Number(weightKg.replace(',', '.')) : null,
        height_cm: heightCm ? Number(heightCm) : null,
        sex,
        fitness_goal: fitnessGoal,
        notes: notes.trim() || null,
      })
      .select('id')
      .single()

    if (data) {
      // Best-effort — the client is saved either way, so a failed/slow email
      // send shouldn't block the trainer from continuing.
      supabase.functions.invoke('send-client-invite', { body: { intake_id: data.id } }).catch(err => {
        console.warn('Nepodařilo se odeslat pozvánku', err)
      })
    }

    setIsSaving(false)

    if (error) {
      setMessage({ type: 'error', text: t('trainer.addClient.saveError') })
      return
    }

    setMessage({ type: 'success', text: t('trainer.addClient.saveSuccess') })
    router.back()
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-coal" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView className="flex-1 bg-coal" contentContainerClassName="px-5 py-6">
        <Heading underline className="mb-6">
          {t('trainer.addClient.title')}
        </Heading>

        <TextField label={t('trainer.addClient.nameLabel')} value={fullName} onChangeText={setFullName} />
        <TextField
          label={t('trainer.addClient.emailLabel')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Text className="-mt-3 mb-4 text-xs text-muted">{t('trainer.addClient.emailHint')}</Text>

        <TextField label={t('trainer.addClient.phoneLabel')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField
              label={t('trainer.addClient.ageLabel')}
              value={age}
              onChangeText={v => setAge(digitsOnly(v))}
              keyboardType="number-pad"
            />
          </View>
          <View className="flex-1">
            <TextField
              label={t('trainer.addClient.weightLabel')}
              value={weightKg}
              onChangeText={v => setWeightKg(decimalDigitsOnly(v))}
              keyboardType="decimal-pad"
            />
          </View>
          <View className="flex-1">
            <TextField
              label={t('trainer.addClient.heightLabel')}
              value={heightCm}
              onChangeText={v => setHeightCm(digitsOnly(v))}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
          {t('trainer.addClient.sexLabel')}
        </Text>
        <ChipSelect options={sexOptions} value={sex} onChange={setSex} className="mb-4" />

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
          {t('trainer.addClient.goalLabel')}
        </Text>
        <ChipSelect options={goalOptions} value={fitnessGoal} onChange={setFitnessGoal} className="mb-4" />

        <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
          {t('trainer.addClient.notesLabel')}
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={t('trainer.addClient.notesPlaceholder')}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          className="mb-4 h-20 rounded-md border border-border bg-graph px-4 py-3 text-base text-ivory"
        />

        <MessageBanner message={message} />

        <Button label={t('trainer.addClient.save')} onPress={handleSave} isLoading={isSaving} className="mt-4" />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
