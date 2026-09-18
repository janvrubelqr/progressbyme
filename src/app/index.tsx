import { Link, Redirect, useRouter } from 'expo-router'
import { ScrollView, Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Eyebrow } from '@/components/ui/heading'
import { useAuthStore } from '@/stores/auth-store'

export default function Index() {
  const session = useAuthStore(state => state.session)
  const profile = useAuthStore(state => state.profile)

  if (session) {
    if (profile?.role === 'trainer') {
      return <Redirect href="/(trainer)/clients" />
    }
    return <Redirect href="/(client)/home" />
  }

  return <Landing />
}

function Landing() {
  const router = useRouter()

  return (
    <ScrollView className="flex-1 bg-coal" contentContainerClassName="px-6 pb-16 pt-16">
      <View className="mb-14 flex-row items-center justify-between">
        <View>
          <Text className="font-display-bold text-lg tracking-[2px] text-ivory">DAVID DUBSKÝ</Text>
          <Text className="mt-1 font-display-medium text-[9px] tracking-[4px] text-muted">COACHING</Text>
        </View>
        <Link href="/login">
          <Text className="font-sans-medium text-sm text-gold">Přihlásit se</Text>
        </Link>
      </View>

      <Eyebrow className="mb-4">Kompletní vedení · Celá ČR</Eyebrow>

      <Text className="font-display-bold text-4xl uppercase leading-[1.05] text-ivory">Nezůstaneš na to</Text>
      <Text className="mb-6 font-display-bold text-4xl uppercase leading-[1.05] text-gold">Sám.</Text>
      <View className="mb-6 h-px w-10 bg-gold" />

      <Text className="mb-8 text-base leading-6 text-muted">
        Už jsi to zkoušel sám a po měsíci to vyšumělo. Tentokrát dostaneš plán, jídelníček – a hlavně někoho, kdo se
        každý týden podívá, jak ti to jde, a podle toho to změní.
      </Text>

      <Button label="Chci začít" onPress={() => router.push('/signup')} className="mb-3" />
      <Text className="mb-10 text-xs text-muted">Nejdřív zjistíme, co dává smysl pro tebe.</Text>

      <View className="mb-10 flex-row border-t border-border-soft pt-6">
        <Stat value="11 let" label="ve fitness" />
        <Stat value="100+" label="vedených klientů" />
        <Stat value="Týdně" label="kontrola pokroku" />
      </View>

      <Card>
        <Eyebrow className="mb-2">Krok 4</Eyebrow>
        <Text className="mb-2 font-display-bold text-xl uppercase text-ivory">Nejsi v tom sám</Text>
        <Text className="text-sm leading-5 text-muted">
          Za appkou i plánem jsem já. Vím, kde v tom jsi, a nenechám tě to vzdát.
        </Text>
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
