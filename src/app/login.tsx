import { Link } from 'expo-router'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { Eyebrow, Heading } from '@/components/ui/heading'
import { MessageBanner } from '@/components/ui/message-banner'
import { TextField } from '@/components/ui/text-field'
import { useAuth } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'

export default function LoginScreen() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    message,
    emailError,
    handleEmailBlur,
    handleSignIn,
    handleSendPasswordRecovery,
  } = useAuth()
  const isSubmitting = useAuthStore(state => state.isSubmitting)

  return (
    <KeyboardAvoidingView className="flex-1 bg-coal" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView className="flex-1 bg-coal" contentContainerClassName="flex-grow items-center justify-center px-6 py-12">
        <View className="w-full max-w-[380px]">
          <Eyebrow className="mb-3">Progress by David</Eyebrow>
          <Heading underline className="mb-8">
            Vítej zpátky
          </Heading>

          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            onBlur={handleEmailBlur}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="jan@email.cz"
            error={emailError}
          />

          <TextField
            label="Heslo"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            containerClassName="mb-2"
          />

          <MessageBanner message={message} />

          <Pressable onPress={handleSendPasswordRecovery} className="mb-6 mt-4 self-end">
            <Text className="font-sans-medium text-sm text-gold">Zapomenuté heslo?</Text>
          </Pressable>

          <Button label="Přihlásit se" onPress={handleSignIn} isLoading={isSubmitting} className="mb-6" />

          <View className="flex-row justify-center">
            <Text className="text-muted">Nemáš účet? </Text>
            <Link href="/signup">
              <Text className="font-sans-medium text-gold">Zaregistruj se</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
