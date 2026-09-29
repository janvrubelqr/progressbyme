import { View } from 'react-native'
import Svg, { Circle, G } from 'react-native-svg'

export type MacroRingDatum = { value: number; target: number; color: string }

const SIZE = 160
const STROKE_WIDTH = 13
const GAP = 4
const CENTER = SIZE / 2

export function MacroRings({ rings }: { rings: MacroRingDatum[] }) {
  return (
    <View style={{ width: SIZE, height: SIZE }}>
      <Svg width={SIZE} height={SIZE}>
        {rings.map((ring, index) => {
          const radius = CENTER - STROKE_WIDTH / 2 - index * (STROKE_WIDTH + GAP)
          if (radius <= 0) return null
          const circumference = 2 * Math.PI * radius
          const fraction = ring.target > 0 ? Math.min(ring.value / ring.target, 1) : 0
          const dashoffset = circumference * (1 - fraction)

          return (
            <G key={index}>
              <Circle
                cx={CENTER}
                cy={CENTER}
                r={radius}
                stroke={ring.color}
                strokeOpacity={0.18}
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              <Circle
                cx={CENTER}
                cy={CENTER}
                r={radius}
                stroke={ring.color}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashoffset}
                fill="none"
                transform={`rotate(-90 ${CENTER} ${CENTER})`}
              />
            </G>
          )
        })}
      </Svg>
    </View>
  )
}
