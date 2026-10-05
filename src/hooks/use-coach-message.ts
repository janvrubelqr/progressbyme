import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import type { LanguageCode } from '@/stores/language-store'
import type { ReadinessCategory } from '@/lib/readiness'

export type CoachMessageParams = {
  workoutTitle: string
  isAdjusted: boolean
  readinessCategory: ReadinessCategory | null
  goal: string | null
  experienceLevel: string | null
  language: LanguageCode
}

// Calls the ai-coach Edge Function for a short motivational note about
// today's workout. Purely cosmetic copy — the plan itself (readiness score,
// category, volume adjustment) is already decided before this runs, see
// supabase/functions/ai-coach/index.ts. Any failure (function not deployed
// yet, no API key configured, network error) just means no AI message —
// callers should fall back to static copy, never block on this.
export function useCoachMessage(params: CoachMessageParams | null) {
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { workoutTitle, isAdjusted, readinessCategory, goal, experienceLevel, language } = params ?? {}

  useEffect(() => {
    if (!workoutTitle || !language) {
      setMessage(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setMessage(null)

    supabase.functions
      .invoke<{ message?: string }>('ai-coach', {
        body: { workoutTitle, isAdjusted, readinessCategory, goal, experienceLevel, language },
      })
      .then(({ data, error }) => {
        if (cancelled) return
        setMessage(!error && data?.message ? data.message : null)
      })
      .catch(() => {
        if (!cancelled) setMessage(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutTitle, isAdjusted, readinessCategory, goal, experienceLevel, language])

  return { message, isLoading }
}
