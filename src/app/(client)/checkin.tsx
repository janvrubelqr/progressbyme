import { useState } from 'react'
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/heading'
import { TextField } from '@/components/ui/text-field'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'

export default function CheckInScreen() {
  const profile = useAuthStore(state => state.profile)
  const [weight, setWeight] = useState('')
  const [sleepHours, setSleepHours] = useState('')
  const [waterLiters, setWaterLiters] = useState('')
  const [trainingRating, setTrainingRating] = useState<number | null>(null)
  const [recoveryRating, setRecoveryRating] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!profile) return
    setIsSubmitting(true)

    const { error } = await supabase.from('check_ins').insert({
      client_id: profile.id,
      submitted_at: new Date().toISOString(),
      weight: weight ? Number(weight) : null,
      sleep_hours: sleepHours ? Number(sleepHours) : null,
      water_liters: waterLiters ? Number(waterLiters) : null,
      training_rating: trainingRating,
      recovery_rating: recoveryRating,
      notes: notes ? { cely_tyden: notes } : null,
    })

    setIsSubmitting(false)

    if (error) {
      Alert.alert('Chyba', 'Check-in se nepodařilo odeslat')
      return
    }

    Alert.alert('Odesláno', 'Check-in byl úspěšně odeslán')
    setWeight('')
    setSleepHours('')
    setWaterLiters('')
    setTrainingRating(null)
    setRecoveryRating(null)
    setNotes('')
  }

  return (
    <ScrollView className="flex-1 bg-coal" contentContainerClassName="px-5 pb-16 pt-16">
      <Heading underline className="mb-8">
        Check-in
      </Heading>

      <TextField label="Aktuální tělesná hmotnost (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
      <TextField label="Kolik hodin jsi v průměru spal/a?" value={sleepHours} onChangeText={setSleepHours} keyboardType="decimal-pad" />
      <TextField label="Kolik litrů vody jsi denně vypil/a?" value={waterLiters} onChangeText={setWaterLiters} keyboardType="decimal-pad" />

      <RatingField label="Jak hodnotíš svůj výkon v tréninku (1–10)?" value={trainingRating} onChange={setTrainingRating} />
      <RatingField label="Jak ses cítil/a z hlediska regenerace (1–10)?" value={recoveryRating} onChange={setRecoveryRating} />

      <Text className="mb-1.5 font-sans-medium text-xs uppercase tracking-[1px] text-muted">
        Jak ses cítil/a tento týden celkově?
      </Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        className="mb-6 h-28 rounded-md border border-border bg-graph px-4 py-3 text-base text-ivory"
      />

      <Button label="Submit" onPress={handleSubmit} isLoading={isSubmitting} />
    </ScrollView>
  )
}

function RatingField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (value: number) => void
}) {
  return (
    <View className="mb-5">
      <Text className="mb-2 font-sans-medium text-xs uppercase tracking-[1px] text-muted">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            className={`h-9 w-9 items-center justify-center rounded-full border ${
              value === n ? 'border-gold bg-gold' : 'border-border bg-graph'
            }`}
          >
            <Text className={`font-display-medium text-sm ${value === n ? 'text-coal' : 'text-muted'}`}>{n}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}
