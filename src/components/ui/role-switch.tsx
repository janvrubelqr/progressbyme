import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Animated, Pressable, Text, View } from 'react-native'

import { useSwitchRole } from '@/hooks/use-switch-role'

const TRACK_WIDTH = 132
const TRACK_PADDING = 3
const HALF_WIDTH = (TRACK_WIDTH - TRACK_PADDING * 2) / 2

export function RoleSwitch({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { switchRole, currentRole } = useSwitchRole()
  const isTrainer = currentRole === 'trainer'
  const anim = useRef(new Animated.Value(isTrainer ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(anim, {
      toValue: isTrainer ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start()
  }, [isTrainer, anim])

  if (!currentRole) return null

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, HALF_WIDTH] })

  return (
    <View
      style={{ width: TRACK_WIDTH, padding: TRACK_PADDING }}
      className={`flex-row overflow-hidden rounded-full border border-border bg-graph ${className ?? ''}`}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: TRACK_PADDING,
          bottom: TRACK_PADDING,
          left: TRACK_PADDING,
          width: HALF_WIDTH,
          borderRadius: 999,
          backgroundColor: '#D2A85E',
          transform: [{ translateX }],
        }}
      />
      <Pressable
        onPress={() => isTrainer && switchRole()}
        hitSlop={4}
        style={{ width: HALF_WIDTH }}
        className="items-center justify-center py-1.5 active:opacity-70"
      >
        <Text className={`font-sans-medium text-[11px] ${isTrainer ? 'text-muted' : 'text-coal'}`}>
          {t('roleSwitch.client')}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => !isTrainer && switchRole()}
        hitSlop={4}
        style={{ width: HALF_WIDTH }}
        className="items-center justify-center py-1.5 active:opacity-70"
      >
        <Text className={`font-sans-medium text-[11px] ${isTrainer ? 'text-coal' : 'text-muted'}`}>
          {t('roleSwitch.trainer')}
        </Text>
      </Pressable>
    </View>
  )
}
