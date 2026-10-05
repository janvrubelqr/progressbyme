import { Link, Redirect, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Eyebrow } from '@/components/ui/heading'
import { useAuthStore } from '@/stores/auth-store'

export default function Index() {
  const session = useAuthStore(state => state.session)
  const profile = useAuthStore(state => state.profile)

  if (session && profile) {
    if (profile.role === 'trainer') {
      return <Redirect href="/(trainer)/clients" />
    }
    if (!profile.onboarding_completed_at) {
      return <Redirect href="/onboarding" />
    }
    return <Redirect href="/(client)/home" />
  }

  if (session && !profile) {
    // Signed in, but the profile fetch hasn't resolved yet — redirecting now
    // would hit the (client)/(trainer) Stack.Protected guards before they're
    // satisfied and leave the app stuck on a blank screen.
    return (
      <View className="flex-1 items-center justify-center bg-coal">
        <ActivityIndicator color="#D2A85E" />
      </View>
    )
  }

  return <Landing />
}

function Landing() {
  const router = useRouter()
  const { t } = useTranslation()

  return (
    <ScrollView className="flex-1 bg-coal" contentContainerClassName="px-6 pb-16 pt-16">
      <View className="mb-14 flex-row items-center justify-between">
        <View>
          <Text className="font-display-bold text-lg tracking-[2px] text-ivory">
            {t('landing.brandName').toUpperCase()}
          </Text>
          <Text className="mt-1 font-display-medium text-[9px] tracking-[4px] text-muted">
            {t('landing.brandSub').toUpperCase()}
          </Text>
        </View>
        <View className="items-end gap-3">
          <Link href="/login">
            <Text className="font-sans-medium text-sm text-gold">{t('landing.signIn')}</Text>
          </Link>
        </View>
      </View>

      <Eyebrow className="mb-4">{t('landing.eyebrow')}</Eyebrow>

      <Text className="font-display-bold text-4xl uppercase leading-[1.05] text-ivory">
        {t('landing.headingLine1')}
      </Text>
      <Text className="mb-6 font-display-bold text-4xl uppercase leading-[1.05] text-gold">
        {t('landing.headingLine2')}
      </Text>
      <View className="mb-6 h-px w-10 bg-gold" />

      <Text className="mb-8 text-base leading-6 text-muted">{t('landing.body')}</Text>

      <Button label={t('landing.cta')} onPress={() => router.push('/signup')} className="mb-3" />
      <Text className="mb-10 text-xs text-muted">{t('landing.ctaNote')}</Text>

      <View className="mb-10 flex-row border-t border-border-soft pt-6">
        <Stat value={t('landing.statYears')} label={t('landing.statYearsLabel')} />
        <Stat value={t('landing.statClients')} label={t('landing.statClientsLabel')} />
        <Stat value={t('landing.statFrequency')} label={t('landing.statFrequencyLabel')} />
      </View>

      <Card>
        <Eyebrow className="mb-2">{t('landing.stepLabel')}</Eyebrow>
        <Text className="mb-2 font-display-bold text-xl uppercase text-ivory">{t('landing.stepTitle')}</Text>
        <Text className="text-sm leading-5 text-muted">{t('landing.stepBody')}</Text>
      </Card>
    </ScrollView>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1">
      <Text className="font-display-bold text-xl text-gold">{value}</Text>
      <Text className="mt-1 text-xs text-muted">{label}</Text>
    </View>
  )
}
