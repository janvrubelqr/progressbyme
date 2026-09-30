import { useEffect, useRef } from 'react'
import { Animated, Easing, View } from 'react-native'

const COLORS = ['#D2A85E', '#4CD97B', '#4A90E2', '#E91E8C', '#F5A623']
const PIECE_COUNT = 18

type Piece = {
  anim: Animated.Value
  angle: number
  distance: number
  color: string
  size: number
  rotateStart: number
  duration: number
}

function makePieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, () => ({
    anim: new Animated.Value(0),
    angle: Math.random() * Math.PI * 2,
    distance: 55 + Math.random() * 55,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 5 + Math.random() * 6,
    rotateStart: Math.random() * 360,
    duration: 800 + Math.random() * 400,
  }))
}

// Fires a short burst of confetti every time `trigger` changes to a value > 0.
export function Confetti({ trigger }: { trigger: number }) {
  const pieces = useRef(makePieces()).current

  useEffect(() => {
    if (trigger === 0) return
    pieces.forEach(p => p.anim.setValue(0))
    Animated.stagger(
      8,
      pieces.map(p => Animated.timing(p.anim, { toValue: 1, duration: p.duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }))
    ).start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])

  if (trigger === 0) return null

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
      {pieces.map((p, index) => {
        const translateX = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * p.distance] })
        const translateY = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.angle) * p.distance + 36] })
        const opacity = p.anim.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] })
        const rotate = p.anim.interpolate({ inputRange: [0, 1], outputRange: [`${p.rotateStart}deg`, `${p.rotateStart + 360}deg`] })

        return (
          <Animated.View
            key={index}
            style={{
              position: 'absolute',
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: 2,
              opacity,
              transform: [{ translateX }, { translateY }, { rotate }],
            }}
          />
        )
      })}
    </View>
  )
}
