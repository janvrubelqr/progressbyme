import { supabase } from '@/lib/supabase'
import type { WorkoutExercise } from '@/types/database'

export type ResolvedExercise = WorkoutExercise & { displayName: string; displayVideoUrl: string | null }

// Resolves each workout exercise's name/video for the viewer's language:
// library exercises pull from exercise_translations (current language, then
// en, then cs as fallbacks), custom one-off exercises use their own fields.
export async function resolveExerciseDisplay(
  exercises: WorkoutExercise[],
  language: string
): Promise<ResolvedExercise[]> {
  const libraryIds = [...new Set(exercises.map(e => e.exercise_id).filter((id): id is string => !!id))]

  const translationsByExercise: Record<
    string,
    { language_code: string; name: string; video_url: string | null }[]
  > = {}

  if (libraryIds.length) {
    const { data } = await supabase
      .from('exercise_translations')
      .select('exercise_id, language_code, name, video_url')
      .in('exercise_id', libraryIds)

    for (const row of data ?? []) {
      ;(translationsByExercise[row.exercise_id] ??= []).push(row)
    }
  }

  return exercises.map(exercise => {
    if (!exercise.exercise_id) {
      return { ...exercise, displayName: exercise.name ?? '', displayVideoUrl: exercise.video_url }
    }

    const translations = translationsByExercise[exercise.exercise_id] ?? []
    const match =
      translations.find(t => t.language_code === language) ??
      translations.find(t => t.language_code === 'en') ??
      translations.find(t => t.language_code === 'cs') ??
      translations[0]

    return {
      ...exercise,
      displayName: match?.name ?? exercise.name ?? '',
      displayVideoUrl: match?.video_url ?? exercise.video_url,
    }
  })
}
