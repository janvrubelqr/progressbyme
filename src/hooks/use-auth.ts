import { useState } from 'react'

import { supabase } from '@/lib/supabase'
import { isValidEmail } from '@/lib/validate-email'
import { useAuthStore } from '@/stores/auth-store'
import type { Message } from '@/components/ui/message-banner'

export const useAuth = () => {
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
      setEmailError('Email není ve správném formátu')
    } else {
      setEmailError(null)
    }
  }

  const handleSignIn = async () => {
    setMessage(null)

    if (!email || !password) {
      setMessage({ type: 'error', text: 'Zadej email a heslo' })
      return
    }
    if (!isValidEmail(email)) {
      setMessage({ type: 'error', text: 'Email není ve správném formátu' })
      return
    }
    setIsSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setIsSubmitting(false)

    if (error) {
      setMessage({ type: 'error', text: 'Neplatné přihlašovací údaje' })
    }
  }

  const handleSignUp = async () => {
    setMessage(null)

    if (!email || !password) {
      setMessage({ type: 'error', text: 'Zadej email a heslo' })
      return
    }
    if (!isValidEmail(email)) {
      setMessage({ type: 'error', text: 'Email není ve správném formátu' })
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
      setMessage({ type: 'success', text: 'Registrační údaje jsme odeslali na tvůj email — potvrď ho kliknutím na odkaz' })
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleSendPasswordRecovery = async () => {
    setMessage(null)

    if (!email) {
      setMessage({ type: 'error', text: 'Zadej email' })
      return
    }
    if (!isValidEmail(email)) {
      setMessage({ type: 'error', text: 'Email není ve správném formátu' })
      return
    }
    setIsSubmitting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    setIsSubmitting(false)

    if (error) {
      setMessage({ type: 'error', text: 'Obnovení hesla se nezdařilo' })
    } else {
      setMessage({ type: 'success', text: 'Zkontroluj email pro instrukce na obnovení hesla' })
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
    handleSendPasswordRecovery,
  }
}
