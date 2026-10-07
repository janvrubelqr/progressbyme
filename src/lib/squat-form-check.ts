// Pure rep-counting/depth logic for the camera form-check prototype — kept
// separate from the MediaPipe/camera wiring (src/app/(client)/form-check.tsx)
// so the angle math and state machine are easy to reason about and test in
// isolation. Squats only for v1 (ADR 0001: start with exercises where this
// is reliable, not all 100+ in the library).

export type Landmark = { x: number; y: number; visibility?: number }

// MediaPipe's 33-point pose model — see
// https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
export const POSE_LANDMARK = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const

// Angle at `b`, between rays b->a and b->c, in degrees. Used for the knee
// angle (hip-knee-ankle) that drives the squat state machine below.
export function angleBetween(a: Landmark, b: Landmark, c: Landmark): number {
  const ab = { x: a.x - b.x, y: a.y - b.y }
  const cb = { x: c.x - b.x, y: c.y - b.y }
  const dot = ab.x * cb.x + ab.y * cb.y
  const magAb = Math.hypot(ab.x, ab.y)
  const magCb = Math.hypot(cb.x, cb.y)
  if (magAb === 0 || magCb === 0) return 180
  const cos = Math.max(-1, Math.min(1, dot / (magAb * magCb)))
  return (Math.acos(cos) * 180) / Math.PI
}

const MIN_VISIBILITY = 0.5

// Picks whichever side (left/right) has better-tracked landmarks this
// frame — people often angle themselves so one side is clearer to the
// camera than the other.
export function kneeAngleFromLandmarks(landmarks: Landmark[]): number | null {
  const side = (hip: number, knee: number, ankle: number) => {
    const h = landmarks[hip]
    const k = landmarks[knee]
    const a = landmarks[ankle]
    if (!h || !k || !a) return null
    const vis = Math.min(h.visibility ?? 1, k.visibility ?? 1, a.visibility ?? 1)
    if (vis < MIN_VISIBILITY) return null
    return { angle: angleBetween(h, k, a), vis }
  }

  const left = side(POSE_LANDMARK.leftHip, POSE_LANDMARK.leftKnee, POSE_LANDMARK.leftAnkle)
  const right = side(POSE_LANDMARK.rightHip, POSE_LANDMARK.rightKnee, POSE_LANDMARK.rightAnkle)

  if (left && right) return left.vis >= right.vis ? left.angle : right.angle
  return (left ?? right)?.angle ?? null
}

export const STANDING_ANGLE = 160 // near-straight leg
export const SQUAT_DEPTH_ANGLE = 100 // roughly thigh-parallel-to-floor or below

export type SquatPhase = 'standing' | 'descending' | 'squatting' | 'ascending'

export type SquatState = {
  phase: SquatPhase
  reps: number
  reachedDepthThisRep: boolean
}

export function initialSquatState(): SquatState {
  return { phase: 'standing', reps: 0, reachedDepthThisRep: false }
}

// One state transition per frame's knee angle. Counts a rep only when the
// person went down to real depth and back up — a shallow dip doesn't count,
// matching how a trainer would actually judge a rep.
export function stepSquatState(state: SquatState, kneeAngle: number): SquatState {
  const reachedDepth = state.reachedDepthThisRep || kneeAngle <= SQUAT_DEPTH_ANGLE

  if (state.phase === 'standing' && kneeAngle < STANDING_ANGLE) {
    return { phase: 'descending', reps: state.reps, reachedDepthThisRep: reachedDepth }
  }
  if ((state.phase === 'descending' || state.phase === 'squatting') && kneeAngle <= SQUAT_DEPTH_ANGLE) {
    return { phase: 'squatting', reps: state.reps, reachedDepthThisRep: true }
  }
  if ((state.phase === 'squatting' || state.phase === 'descending') && kneeAngle > SQUAT_DEPTH_ANGLE && kneeAngle < STANDING_ANGLE) {
    return { phase: 'ascending', reps: state.reps, reachedDepthThisRep: reachedDepth }
  }
  if (state.phase === 'ascending' && kneeAngle >= STANDING_ANGLE) {
    return {
      phase: 'standing',
      reps: state.reachedDepthThisRep ? state.reps + 1 : state.reps,
      reachedDepthThisRep: false,
    }
  }

  return { ...state, reachedDepthThisRep: reachedDepth }
}

export function squatCue(state: SquatState): 'goLower' | 'goodDepth' | null {
  if (state.phase === 'ascending' && !state.reachedDepthThisRep) return 'goLower'
  if (state.phase === 'squatting' && state.reachedDepthThisRep) return 'goodDepth'
  return null
}
