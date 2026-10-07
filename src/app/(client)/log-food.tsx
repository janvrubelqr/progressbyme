import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/heading'
import { MessageBanner, type Message } from '@/components/ui/message-banner'
import { TextField } from '@/components/ui/text-field'
import { digitsOnly } from '@/lib/digits-only'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguageStore } from '@/stores/language-store'

type Estimate = { description: string; kcal: number; proteinG: number; carbsG: number; fatG: number }
type Mode = 'photo' | 'describe'

const SUPPORTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function normalizeMediaType(mimeType: string | undefined): string {
  return mimeType && SUPPORTED_MEDIA_TYPES.includes(mimeType) ? mimeType : 'image/jpeg'
}

// Expo has no first-party speech-to-text — this is the browser's own
// built-in recognizer (Chrome/Edge support it, Safari/Firefox mostly
// don't), so the mic button only ever shows on web and only when the API
// is actually present. Typing the description is always available on every
// platform regardless, which is what makes "voice" a nice-to-have shortcut
// rather than the only way in.
// Not in React Native's TS lib — typed loosely rather than pulling in full
// DOM speech-API ambient types for a web-only, best-effort feature.
function getSpeechRecognitionCtor(): (new () => any) | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
}

const SPEECH_LANG: Record<string, string> = { cs: 'cs-CZ', en: 'en-US', sk: 'sk-SK' }

export default function LogFoodScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const profile = useAuthStore(state => state.profile)
  const language = useLanguageStore(state => state.language)

  const [mode, setMode] = useState<Mode>('photo')
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [isListening, setIsListening] = useState(false)
  const usedVoiceRef = useRef(false)
  const [isEstimating, setIsEstimating] = useState(false)
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [source, setSource] = useState<'photo' | 'voice' | 'manual'>('manual')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => () => recognitionRef.current?.stop(), [])

  const runPhotoEstimate = async (base64: string, uri: string, mediaType: string) => {
    setPhotoUri(uri)
    setEstimate(null)
    setMessage(null)
    setSource('photo')
    setIsEstimating(true)

    const { data, error } = await supabase.functions.invoke<Estimate>('estimate-food-photo', {
      body: { imageBase64: base64, mediaType, language },
    })

    setIsEstimating(false)

    if (error || !data) {
      setMessage({ type: 'error', text: t('logFood.estimateError') })
      return
    }

    setEstimate(data)
  }

  const runTextEstimate = async () => {
    if (!description.trim()) return
    setEstimate(null)
    setMessage(null)
    setSource(usedVoiceRef.current ? 'voice' : 'manual')
    setIsEstimating(true)

    const { data, error } = await supabase.functions.invoke<Estimate>('estimate-food-text', {
      body: { description: description.trim(), language },
    })

    setIsEstimating(false)

    if (error || !data) {
      setMessage({ type: 'error', text: t('logFood.estimateError') })
      return
    }

    setEstimate(data)
  }

  const toggleListening = () => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return

    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    const recognition = new Ctor()
    recognition.lang = SPEECH_LANG[language] ?? 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript
      if (transcript) {
        usedVoiceRef.current = true
        setDescription(prev => (prev ? `${prev} ${transcript}` : transcript))
      }
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    setIsListening(true)
    recognition.start()
  }

  const pickFrom = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      setMessage({ type: 'error', text: t('logFood.permissionDenied') })
      return
    }

    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, base64: true }
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options)

    if (result.canceled || !result.assets?.[0]?.base64) return

    const asset = result.assets[0]
    // The base64 payload is the asset's actual encoding (on web this is the
    // original file, not necessarily re-encoded to JPEG) — declaring the
    // wrong media type makes Anthropic's API reject the request outright,
    // so trust asset.mimeType when present instead of assuming JPEG.
    await runPhotoEstimate(asset.base64!, asset.uri, normalizeMediaType(asset.mimeType))
  }

  const handleSave = async () => {
    if (!profile || !estimate) return
    setIsSaving(true)

    const { error } = await supabase.from('food_logs').insert({
      client_id: profile.id,
      description: estimate.description,
      kcal: estimate.kcal,
      protein: estimate.proteinG,
      carbs: estimate.carbsG,
      fat: estimate.fatG,
      source,
    })

    setIsSaving(false)

    if (error) {
      setMessage({ type: 'error', text: t('logFood.saveError') })
      return
    }

    if (router.canGoBack()) router.back()
    else router.replace('/(client)/nutrition')
  }

  return (
    <ScrollView className="flex-1 bg-coal" contentContainerClassName="px-5 pb-10 pt-16">
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(client)/nutrition'))}
        hitSlop={12}
        className="mb-4 flex-row items-center gap-1.5 self-start active:opacity-60"
      >
        <Ionicons name="chevron-back" size={16} color="#D2A85E" />
        <Text className="font-sans-medium text-sm text-gold">{t('history.back')}</Text>
      </Pressable>

      <Heading underline className="mb-2">
        {t('logFood.title')}
      </Heading>
      <Text className="mb-6 text-sm leading-5 text-muted">{t('logFood.subtitle')}</Text>

      {!estimate ? (
        <View className="mb-4 flex-row gap-2">
          <Pressable
            onPress={() => setMode('photo')}
            className={`flex-1 items-center rounded-md border py-2.5 active:opacity-70 ${
              mode === 'photo' ? 'border-gold bg-gold' : 'border-border bg-graph'
            }`}
          >
            <Text className={`font-sans-medium text-sm ${mode === 'photo' ? 'text-on-gold' : 'text-ivory'}`}>
              {t('logFood.modePhoto')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('describe')}
            className={`flex-1 items-center rounded-md border py-2.5 active:opacity-70 ${
              mode === 'describe' ? 'border-gold bg-gold' : 'border-border bg-graph'
            }`}
          >
            <Text className={`font-sans-medium text-sm ${mode === 'describe' ? 'text-on-gold' : 'text-ivory'}`}>
              {t('logFood.modeDescribe')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {photoUri && mode === 'photo' ? (
        <Image source={{ uri: photoUri }} className="mb-4 h-48 w-full rounded-md" resizeMode="cover" />
      ) : null}

      {!estimate && mode === 'photo' ? (
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => pickFrom('camera')}
            disabled={isEstimating}
            className="flex-1 items-center gap-2 rounded-md border border-border bg-graph py-6 active:opacity-70"
          >
            <Ionicons name="camera-outline" size={24} color="#D2A85E" />
            <Text className="font-sans-medium text-sm text-ivory">{t('logFood.takePhoto')}</Text>
          </Pressable>
          <Pressable
            onPress={() => pickFrom('library')}
            disabled={isEstimating}
            className="flex-1 items-center gap-2 rounded-md border border-border bg-graph py-6 active:opacity-70"
          >
            <Ionicons name="images-outline" size={24} color="#D2A85E" />
            <Text className="font-sans-medium text-sm text-ivory">{t('logFood.chooseLibrary')}</Text>
          </Pressable>
        </View>
      ) : null}

      {!estimate && mode === 'describe' ? (
        <View>
          <TextField
            label={t('logFood.describeLabel')}
            value={description}
            onChangeText={v => {
              usedVoiceRef.current = false
              setDescription(v)
            }}
            placeholder={t('logFood.describePlaceholder')}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="h-24"
          />
          <View className="flex-row gap-3">
            {getSpeechRecognitionCtor() ? (
              <Pressable
                onPress={toggleListening}
                className={`flex-1 flex-row items-center justify-center gap-2 rounded-md border py-3 active:opacity-70 ${
                  isListening ? 'border-gold bg-gold/10' : 'border-border bg-graph'
                }`}
              >
                <Ionicons name={isListening ? 'mic' : 'mic-outline'} size={18} color="#D2A85E" />
                <Text className="font-sans-medium text-sm text-ivory">
                  {isListening ? t('logFood.listening') : t('logFood.speak')}
                </Text>
              </Pressable>
            ) : null}
            <Button
              label={t('logFood.estimateButton')}
              onPress={() => runTextEstimate()}
              disabled={!description.trim() || isEstimating}
              className="flex-1"
            />
          </View>
        </View>
      ) : null}

      {isEstimating ? (
        <View className="mt-6 items-center gap-2">
          <ActivityIndicator color="#D2A85E" />
          <Text className="text-sm text-muted">{t('logFood.estimating')}</Text>
        </View>
      ) : null}

      {estimate ? (
        <View className="mt-2">
          <View className="mb-4 rounded-md border border-gold/30 bg-gold/10 px-3 py-2.5">
            <Text className="text-sm leading-5 text-gold">{t('logFood.estimateNotice')}</Text>
          </View>

          <TextField
            label={t('logFood.descriptionLabel')}
            value={estimate.description}
            onChangeText={v => setEstimate(prev => (prev ? { ...prev, description: v } : prev))}
          />

          <View className="flex-row gap-3">
            <TextField
              label={t('logFood.kcalLabel')}
              containerClassName="flex-1"
              value={String(estimate.kcal)}
              onChangeText={v => setEstimate(prev => (prev ? { ...prev, kcal: Number(digitsOnly(v)) || 0 } : prev))}
              keyboardType="number-pad"
            />
            <TextField
              label={t('logFood.proteinLabel')}
              containerClassName="flex-1"
              value={String(estimate.proteinG)}
              onChangeText={v => setEstimate(prev => (prev ? { ...prev, proteinG: Number(digitsOnly(v)) || 0 } : prev))}
              keyboardType="number-pad"
            />
          </View>
          <View className="flex-row gap-3">
            <TextField
              label={t('logFood.carbsLabel')}
              containerClassName="flex-1"
              value={String(estimate.carbsG)}
              onChangeText={v => setEstimate(prev => (prev ? { ...prev, carbsG: Number(digitsOnly(v)) || 0 } : prev))}
              keyboardType="number-pad"
            />
            <TextField
              label={t('logFood.fatLabel')}
              containerClassName="flex-1"
              value={String(estimate.fatG)}
              onChangeText={v => setEstimate(prev => (prev ? { ...prev, fatG: Number(digitsOnly(v)) || 0 } : prev))}
              keyboardType="number-pad"
            />
          </View>

          <MessageBanner message={message} />

          <Button label={t('logFood.save')} onPress={handleSave} isLoading={isSaving} className="mt-2" />
          <Button
            label={t('logFood.startOver')}
            variant="ghost"
            onPress={() => {
              setEstimate(null)
              setPhotoUri(null)
              setDescription('')
              usedVoiceRef.current = false
              setMessage(null)
            }}
            className="mt-3"
          />
        </View>
      ) : (
        <MessageBanner message={message} />
      )}
    </ScrollView>
  )
}
