import { useState } from 'react'
import { Text, View, type LayoutChangeEvent } from 'react-native'
import Svg, { Circle, Line } from 'react-native-svg'

const CHART_HEIGHT = 64
const PADDING_Y = 8
const PADDING_X = 5

export type MiniLineChartPoint = { label: string; value: number | null }

export function MiniLineChart({ data, emptyLabel }: { data: MiniLineChartPoint[]; emptyLabel: string }) {
  const [width, setWidth] = useState(0)
  const values = data.map(d => d.value).filter((v): v is number => v != null)
  const hasData = values.length > 0
  const max = hasData ? Math.max(...values) : 0
  const min = hasData ? Math.min(...values) : 0
  const range = max - min

  if (!hasData) {
    return (
      <View style={{ height: CHART_HEIGHT }} className="items-center justify-center">
        <Text className="text-sm text-muted">{emptyLabel}</Text>
      </View>
    )
  }

  const innerHeight = CHART_HEIGHT - PADDING_Y * 2
  const innerWidth = Math.max(width - PADDING_X * 2, 0)
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0

  const points = data.map((point, index) => {
    if (point.value == null) return null
    const x = PADDING_X + stepX * index
    const y = (range === 0 ? innerHeight / 2 : innerHeight - ((point.value - min) / range) * innerHeight) + PADDING_Y
    return { x, y }
  })

  return (
    <View>
      <View style={{ height: CHART_HEIGHT }} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={CHART_HEIGHT}>
            {points.map((point, index) => {
              const next = points[index + 1]
              if (!point || !next) return null
              return (
                <Line
                  key={`line-${index}`}
                  x1={point.x}
                  y1={point.y}
                  x2={next.x}
                  y2={next.y}
                  stroke="#D2A85E"
                  strokeWidth={2}
                />
              )
            })}
            {points.map((point, index) =>
              point ? <Circle key={`dot-${index}`} cx={point.x} cy={point.y} r={3.5} fill="#D2A85E" /> : null
            )}
          </Svg>
        ) : null}
      </View>
      <View className="mt-1 flex-row justify-between">
        {data.map((point, index) => (
          <Text key={index} className="text-[10px] text-muted">
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  )
}
