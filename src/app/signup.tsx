import { Link } from 'expo-router'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { Eyebrow, Heading } from '@/components/ui/heading'
import { MessageBanner } from '@/components/ui/message-banner'
import { TextField } from '@/components/ui/text-field'
import { useAuth } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'

export default function SignupScreen() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    fullName,
    setFullName,
    message,
    emailError,
    handleEmailBlur,
    handleSignUp,
  } = useAuth()
  const isSubmitting = useAuthStore(state => state.isSubmitting)

  return (
    <KeyboardAvoidingView className="flex-1 bg-coal" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView className="flex-1 bg-coal" contentContainerClassName="flex-grow items-center justify-center px-6 py-12">
        <View className="w-full max-w-[380px]">
          <Eyebrow className="mb-3">Progress by David</Eyebrow>
          <Heading underline className="mb-8">
            Vytvoř si účet
          </Heading>

          <TextField label="Jméno" value={fullName} onChangeText={setFullName} placeholder="Jan Vrubel" />
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

          <Button label="Zaregistrovat se" onPress={handleSignUp} isLoading={isSubmitting} className="mb-6 mt-4" />

          <View className="flex-row justify-center">
            <Text className="text-muted">Už máš účet? </Text>
            <Link href="/login">
              <Text className="font-sans-medium text-gold">Přihlas se</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
