import { Link } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { GoogleButton, OrDivider } from '@/components/ui/google-button'
import { Eyebrow, Heading } from '@/components/ui/heading'
import { MessageBanner } from '@/components/ui/message-banner'
import { TextField } from '@/components/ui/text-field'
import { useAuth } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'

export default function LoginScreen() {
  const { t } = useTranslation()
  const {
    email,
    setEmail,
    password,
    setPassword,
    message,
    emailError,
    handleEmailBlur,
    handleSignIn,
    handleGoogleSignIn,
    handleSendPasswordRecovery,
  } = useAuth()
  const isSubmitting = useAuthStore(state => state.isSubmitting)

  return (
    <KeyboardAvoidingView className="flex-1 bg-coal" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView className="flex-1 bg-coal" contentContainerClassName="flex-grow items-center justify-center px-6 py-12">
        <View className="w-full max-w-[380px]">
          <Eyebrow className="mb-3">{t('auth.brandEyebrow')}</Eyebrow>
          <Heading underline className="mb-8">
            {t('auth.loginHeading')}
          </Heading>

          <TextField
            label={t('auth.emailLabel')}
            value={email}
            onChangeText={setEmail}
            onBlur={handleEmailBlur}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder={t('auth.emailPlaceholder')}
            error={emailError}
          />

          <TextField
            label={t('auth.passwordLabel')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            containerClassName="mb-2"
          />

          <MessageBanner message={message} />

          <Pressable onPress={handleSendPasswordRecovery} hitSlop={8} className="mb-6 mt-4 self-end active:opacity-60">
            <Text className="font-sans-medium text-sm text-gold">{t('auth.forgotPassword')}</Text>
          </Pressable>

          <Button label={t('auth.signInButton')} onPress={handleSignIn} isLoading={isSubmitting} className="mb-2" />

          <OrDivider />

          <GoogleButton onPress={handleGoogleSignIn} isLoading={isSubmitting} className="mb-6" />

          <View className="flex-row justify-center">
            <Text className="text-muted">{t('auth.noAccount')} </Text>
            <Link href="/signup">
              <Text className="font-sans-medium text-gold">{t('auth.signUpLink')}</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
