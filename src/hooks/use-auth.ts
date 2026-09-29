import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform } from 'react-native'

import { supabase } from '@/lib/supabase'
import { isValidEmail } from '@/lib/validate-email'
import { useAuthStore } from '@/stores/auth-store'
import type { Message } from '@/components/ui/message-banner'

export const useAuth = () => {
  const { t } = useTranslation()
  const setIsSubmitting = useAuthStore(state => state.setIsSubmitting)
  const [email, setEmailRaw] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [message, setMessage] = useState<Message | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)

  const setEmail = (value: string) => {
    setEmailRaw(value)
    if (emailError) setEmailError(null)
  }

  const handleEmailBlur = () => {
    if (email && !isValidEmail(email)) {
      setEmailError(t('auth.emailInvalid'))
    } else {
      setEmailError(null)
    }
  }

  const handleSignIn = async () => {
    setMessage(null)

    if (!email || !password) {
      setMessage({ type: 'error', text: t('auth.fillEmailAndPassword') })
      return
    }
    if (!isValidEmail(email)) {
      setMessage({ type: 'error', text: t('auth.emailInvalid') })
      return
    }
    setIsSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setIsSubmitting(false)

    if (error) {
      setMessage({ type: 'error', text: t('auth.invalidCredentials') })
    }
  }

  const handleSignUp = async () => {
    setMessage(null)

    if (!email || !password) {
      setMessage({ type: 'error', text: t('auth.fillEmailAndPassword') })
      return
    }
    if (!isValidEmail(email)) {
      setMessage({ type: 'error', text: t('auth.emailInvalid') })
      return
    }
    setIsSubmitting(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (error) {
      setIsSubmitting(false)
      setMessage({ type: 'error', text: error.message })
      return
    }

    if (data.user && data.session) {
      // Only insert here when a session exists immediately (email confirmation disabled).
      // Otherwise there's no authenticated request yet — RLS would reject it — so the
      // profile gets created lazily on first login instead (see useAuthSession).
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName || null,
        role: 'client',
      })

      if (profileError) {
        console.error('Chyba při vytváření profilu', profileError)
      }
    }

    setIsSubmitting(false)

    if (!data.session) {
      // Stay on the signup screen (not login) so the success message is actually
      // seen — navigating away would unmount this hook's local state.
      setEmailRaw('')
      setPassword('')
      setFullName('')
      setMessage({ type: 'success', text: t('auth.signupSuccess') })
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleGoogleSignIn = async () => {
    setMessage(null)
    setIsSubmitting(true)

    const redirectTo = Platform.OS === 'web' ? window.location.origin : Linking.createURL('/')

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
    })

    if (error || !data.url) {
      setIsSubmitting(false)
      setMessage({ type: 'error', text: t('auth.googleSignInFailed') })
      return
    }

    // On web, signInWithOAuth already redirected the whole page to Google —
    // nothing left to do here. Native opens it in an in-app browser instead
    // and has to finish the exchange itself once Google redirects back.
    if (Platform.OS !== 'web') {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)

      if (result.type === 'success' && result.url) {
        const code = new URL(result.url).searchParams.get('code')
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) {
            setMessage({ type: 'error', text: t('auth.googleSignInFailed') })
          }
        }
      }
      setIsSubmitting(false)
    }
  }

  const handleSendPasswordRecovery = async () => {
    setMessage(null)

    if (!email) {
      setMessage({ type: 'error', text: t('auth.fillEmail') })
      return
    }
    if (!isValidEmail(email)) {
      setMessage({ type: 'error', text: t('auth.emailInvalid') })
      return
    }
    setIsSubmitting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    setIsSubmitting(false)

    if (error) {
      setMessage({ type: 'error', text: t('auth.resetPasswordFailed') })
    } else {
      setMessage({ type: 'success', text: t('auth.resetPasswordSuccess') })
    }
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    fullName,
    setFullName,
    message,
    emailError,
    handleEmailBlur,
    handleSignIn,
    handleSignUp,
    handleSignOut,
    handleGoogleSignIn,
    handleSendPasswordRecovery,
  }
}
