import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, Pressable, Text, View } from 'react-native'

import { Heading } from '@/components/ui/heading'
import {
  initialSquatState,
  kneeAngleFromLandmarks,
  POSE_LANDMARK,
  squatCue,
  stepSquatState,
  type SquatState,
} from '@/lib/squat-form-check'

// web-only prototype (ADR 0001 / architecture-handoff.md: try the camera
// pipeline on web first, before a native dev client exists). All pose
// detection runs on-device via MediaPipe's WASM runtime — no frame or
// video ever leaves the browser.
const MEDIAPIPE_VERSION = '0.10.14'
const VISION_BUNDLE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.mjs`
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'

// @mediapipe/tasks-vision's own bundle contains a dynamic import() that
// Metro's bundler can't statically analyze ("Invalid call at line 1:
// import(t.toString())"), so it can't be imported as a normal npm
// dependency here. Loading it as a real browser <script type="module">
// instead sidesteps Metro completely — the browser's native ES module
// loader handles it, same as any other web page would.
let visionModulePromise: Promise<{ FilesetResolver: any; PoseLandmarker: any }> | null = null

function loadMediaPipeVision() {
  if (!visionModulePromise) {
    visionModulePromise = new Promise((resolve, reject) => {
      const callbackName = '__onMediapipeVisionLoaded'
      ;(window as any)[callbackName] = (mod: any) => resolve(mod)

      const script = document.createElement('script')
      script.type = 'module'
      script.textContent = `
        import * as vision from '${VISION_BUNDLE_URL}';
        window.${callbackName}(vision);
      `
      script.onerror = () => reject(new Error('Failed to load MediaPipe vision bundle'))
      document.head.appendChild(script)
    })
  }
  return visionModulePromise
}

// Connections drawn for the skeleton overlay — just enough to visibly
// confirm tracking is working, not a full anatomical render.
const SKELETON_CONNECTIONS: [number, number][] = [
  [POSE_LANDMARK.leftShoulder, POSE_LANDMARK.rightShoulder],
  [POSE_LANDMARK.leftShoulder, POSE_LANDMARK.leftHip],
  [POSE_LANDMARK.rightShoulder, POSE_LANDMARK.rightHip],
  [POSE_LANDMARK.leftHip, POSE_LANDMARK.rightHip],
  [POSE_LANDMARK.leftHip, POSE_LANDMARK.leftKnee],
  [POSE_LANDMARK.leftKnee, POSE_LANDMARK.leftAnkle],
  [POSE_LANDMARK.rightHip, POSE_LANDMARK.rightKnee],
  [POSE_LANDMARK.rightKnee, POSE_LANDMARK.rightAnkle],
]

export default function FormCheckScreen() {
  const { t } = useTranslation()
  const router = useRouter()

  if (Platform.OS !== 'web') {
    return (
      <View className="flex-1 items-center justify-center bg-coal px-8">
        <Ionicons name="camera-outline" size={32} color="#948C7D" />
        <Text className="mt-3 text-center text-sm text-muted">{t('formCheck.nativeNotYet')}</Text>
      </View>
    )
  }

  return <WebFormCheck onBack={() => (router.canGoBack() ? router.back() : router.replace('/(client)/workout'))} />
}

function WebFormCheck({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  const containerRef = useRef<View>(null)
  const canvasRef = useRef<any>(null)
  const squatStateRef = useRef<SquatState>(initialSquatState())

  const [status, setStatus] = useState<'requesting' | 'loading' | 'running' | 'error'>('requesting')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reps, setReps] = useState(0)
  const [cue, setCue] = useState<'goLower' | 'goodDepth' | null>(null)

  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | null = null
    let rafId: number | null = null
    let landmarker: any = null
    let video: HTMLVideoElement | null = null

    const run = async () => {
      const container = containerRef.current as unknown as HTMLElement | null
      if (!container) return

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      } catch {
        if (!cancelled) {
          setStatus('error')
          setErrorMessage(t('formCheck.cameraDenied'))
        }
        return
      }
      if (cancelled) {
        stream.getTracks().forEach(t => t.stop())
        return
      }

      video = document.createElement('video')
      video.srcObject = stream
      video.muted = true
      video.playsInline = true
      video.style.width = '100%'
      video.style.height = '100%'
      video.style.objectFit = 'cover'
      video.style.transform = 'scaleX(-1)' // mirror, like looking in a mirror
      container.appendChild(video)
      await video.play()

      const canvas = document.createElement('canvas')
      canvas.style.position = 'absolute'
      canvas.style.top = '0'
      canvas.style.left = '0'
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      canvas.style.transform = 'scaleX(-1)'
      container.appendChild(canvas)
      canvasRef.current = canvas

      if (cancelled) return
      setStatus('loading')

      const { FilesetResolver, PoseLandmarker } = await loadMediaPipeVision()
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE)
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
      })

      if (cancelled) return
      setStatus('running')

      let lastVideoTime = -1
      const ctx = canvas.getContext('2d')!

      const renderLoop = () => {
        if (cancelled || !video) return
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime
          const result = landmarker.detectForVideo(video, performance.now())
          ctx.clearRect(0, 0, canvas.width, canvas.height)

          const landmarks = result.landmarks?.[0]
          if (landmarks) {
            drawSkeleton(ctx, landmarks, canvas.width, canvas.height)

            const kneeAngle = kneeAngleFromLandmarks(landmarks)
            if (kneeAngle != null) {
              squatStateRef.current = stepSquatState(squatStateRef.current, kneeAngle)
              setReps(squatStateRef.current.reps)
              setCue(squatCue(squatStateRef.current))
            }
          }
        }

        rafId = requestAnimationFrame(renderLoop)
      }
      renderLoop()
    }

    run()

    return () => {
      cancelled = true
      if (rafId != null) cancelAnimationFrame(rafId)
      stream?.getTracks().forEach(t => t.stop())
      landmarker?.close?.()
      video?.remove()
      canvasRef.current?.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <View className="flex-1 bg-coal">
      <View className="flex-row items-center justify-between px-5 pt-16">
        <Pressable onPress={onBack} hitSlop={12} className="flex-row items-center gap-1.5 active:opacity-60">
          <Ionicons name="chevron-back" size={16} color="#D2A85E" />
          <Text className="font-sans-medium text-sm text-gold">{t('history.back')}</Text>
        </Pressable>
        <View className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1">
          <Text className="font-display-medium text-xs uppercase tracking-[1px] text-gold">{t('formCheck.betaTag')}</Text>
        </View>
      </View>

      <Heading underline className="mx-5 mb-2 mt-4">
        {t('formCheck.title')}
      </Heading>
      <Text className="mx-5 mb-4 text-sm leading-5 text-muted">{t('formCheck.subtitle')}</Text>

      <View className="mx-5 mb-4 aspect-[3/4] overflow-hidden rounded-md bg-graph">
        {/* On web, a View's ref is the underlying DOM node — that's what we attach the raw <video>/<canvas> elements to. */}
        <View ref={containerRef} style={{ flex: 1, position: 'relative' }} />

        {status !== 'running' ? (
          <View className="absolute inset-0 items-center justify-center bg-coal/70 px-6">
            <Text className="text-center text-sm text-muted">
              {status === 'requesting'
                ? t('formCheck.requestingCamera')
                : status === 'loading'
                  ? t('formCheck.loadingModel')
                  : errorMessage}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mx-5 flex-row items-center justify-between rounded-md border border-border bg-graph px-4 py-3">
        <View>
          <Text className="font-sans-medium text-xs uppercase tracking-[1px] text-muted">{t('formCheck.repsLabel')}</Text>
          <Text className="font-display-bold text-3xl text-ivory">{reps}</Text>
        </View>
        {cue ? (
          <Text className={`text-sm font-sans-medium ${cue === 'goLower' ? 'text-amber-400' : 'text-good'}`}>
            {t(cue === 'goLower' ? 'formCheck.cueGoLower' : 'formCheck.cueGoodDepth')}
          </Text>
        ) : null}
      </View>

      <Text className="mx-5 mt-4 text-xs leading-4 text-muted">{t('formCheck.privacyNote')}</Text>
    </View>
  )
}

function drawSkeleton(ctx: CanvasRenderingContext2D, landmarks: { x: number; y: number }[], width: number, height: number) {
  ctx.strokeStyle = '#D2A85E'
  ctx.lineWidth = 3
  ctx.fillStyle = '#F2E7CF'

  for (const [a, b] of SKELETON_CONNECTIONS) {
    const pa = landmarks[a]
    const pb = landmarks[b]
    if (!pa || !pb) continue
    ctx.beginPath()
    ctx.moveTo(pa.x * width, pa.y * height)
    ctx.lineTo(pb.x * width, pb.y * height)
    ctx.stroke()
  }

  for (const index of Object.values(POSE_LANDMARK)) {
    const p = landmarks[index]
    if (!p) continue
    ctx.beginPath()
    ctx.arc(p.x * width, p.y * height, 5, 0, Math.PI * 2)
    ctx.fill()
  }
}

