import { Link } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { GoogleButton, OrDivider } from '@/components/ui/google-button'
import { Eyebrow, Heading } from '@/components/ui/heading'
import { MessageBanner } from '@/components/ui/message-banner'
import { TextField } from '@/components/ui/text-field'
import { useAuth } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'

export default function SignupScreen() {
  const { t } = useTranslation()
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
    handleGoogleSignIn,
  } = useAuth()
  const isSubmitting = useAuthStore(state => state.isSubmitting)

  return (
    <KeyboardAvoidingView className="flex-1 bg-coal" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView className="flex-1 bg-coal" contentContainerClassName="flex-grow items-center justify-center px-6 py-12">
        <View className="w-full max-w-[380px]">
          <Eyebrow className="mb-3">{t('auth.brandEyebrow')}</Eyebrow>
          <Heading underline className="mb-8">
            {t('auth.signupHeading')}
          </Heading>

          <TextField
            label={t('auth.nameLabel')}
            value={fullName}
            onChangeText={setFullName}
            placeholder={t('auth.namePlaceholder')}
          />
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

          <Button label={t('auth.signUpButton')} onPress={handleSignUp} isLoading={isSubmitting} className="mb-2 mt-4" />

          <OrDivider />

          <GoogleButton onPress={handleGoogleSignIn} isLoading={isSubmitting} className="mb-6" />

          <View className="flex-row justify-center">
            <Text className="text-muted">{t('auth.haveAccount')} </Text>
            <Link href="/login">
              <Text className="font-sans-medium text-gold">{t('auth.signInLink')}</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
