import { Link } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native'

import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { RoleSwitch } from '@/components/ui/role-switch'
import { SignOutButton } from '@/components/ui/sign-out-button'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { ClientIntake, Profile } from '@/types/database'

type Row = { kind: 'client'; profile: Profile } | { kind: 'pending'; intake: ClientIntake }

export default function ClientsListScreen() {
  const { t } = useTranslation()
  const profile = useAuthStore(state => state.profile)
  const { handleSignOut } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadClients = useCallback(async () => {
    if (!profile) return
    setIsLoading(true)

    const [{ data: clients }, { data: pending }] = await Promise.all([
      supabase.from('profiles').select('*').eq('trainer_id', profile.id).order('full_name', { ascending: true }),
      supabase
        .from('client_intake')
        .select('*')
        .eq('trainer_id', profile.id)
        .is('claimed_by', null)
        .order('created_at', { ascending: false }),
    ])

    setRows([
      ...(clients ?? []).map((p): Row => ({ kind: 'client', profile: p })),
      ...(pending ?? []).map((i): Row => ({ kind: 'pending', intake: i })),
    ])
    setIsLoading(false)
  }, [profile])

  useEffect(() => {
    loadClients()
  }, [loadClients])

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
      contentContainerClassName="px-5 pb-10 pt-16"
      data={rows}
      keyExtractor={row => (row.kind === 'client' ? row.profile.id : row.intake.id)}
      ListHeaderComponent={
        <View className="mb-6">
          <View className="flex-row flex-wrap items-center justify-end gap-2">
            <LanguageSwitcher />
            <RoleSwitch />
            <SignOutButton onPress={handleSignOut} />
          </View>

          <View className="mt-4 flex-row items-end justify-between">
            <Heading>{t('trainer.clientsTitle')}</Heading>
            <View className="items-end gap-2">
              <Link href="/(trainer)/clients/new" asChild>
                <Pressable hitSlop={8} className="active:opacity-60">
                  <Text className="font-sans-medium text-xs text-gold">{t('trainer.addClient.link')}</Text>
                </Pressable>
              </Link>
              <Link href="/(trainer)/exercises" asChild>
                <Pressable hitSlop={8} className="active:opacity-60">
                  <Text className="font-sans-medium text-xs text-muted">{t('trainer.exerciseLibrary.manageLink')}</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
      }
      ListEmptyComponent={<Text className="text-muted">{t('trainer.clientsEmpty')}</Text>}
      ItemSeparatorComponent={() => <View className="h-3" />}
      renderItem={({ item }) => {
        if (item.kind === 'pending') {
          return (
            <Card className="opacity-70">
              <View className="flex-row items-center justify-between">
                <Text className="font-display text-lg text-ivory">{item.intake.full_name}</Text>
                <View className="rounded-full border border-gold/40 bg-gold-50 px-2 py-0.5">
                  <Text className="text-[10px] uppercase tracking-[0.5px] text-gold">{t('trainer.pendingBadge')}</Text>
                </View>
              </View>
              <Text className="mt-1 text-sm text-muted">{item.intake.email}</Text>
            </Card>
          )
        }

        return (
          <Link href={{ pathname: '/(trainer)/clients/[id]', params: { id: item.profile.id } }} asChild>
            <Card>
              <Text className="font-display text-lg text-ivory">{item.profile.full_name ?? t('trainer.unnamedClient')}</Text>
            </Card>
          </Link>
        )
      }}
    />
  )
}
