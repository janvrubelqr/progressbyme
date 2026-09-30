import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Animated, Easing, Pressable, Text, View } from 'react-native'

import { useSwitchRole } from '@/hooks/use-switch-role'

const TRACK_WIDTH = 132
const TRACK_PADDING = 3
const HALF_WIDTH = (TRACK_WIDTH - TRACK_PADDING * 2) / 2
const SLIDE_DURATION = 320

export function RoleSwitch({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { switchRole, currentRole } = useSwitchRole()
  const isTrainer = currentRole === 'trainer'

  // Drives the visible slide separately from the real role: switching roles
  // also navigates to a whole different screen, which would otherwise unmount
  // this component mid-animation. Slide first, then commit the actual switch
  // (DB update + navigation) once the knob has finished moving.
  const [pendingTrainer, setPendingTrainer] = useState(isTrainer)
  const anim = useRef(new Animated.Value(isTrainer ? 1 : 0)).current

  useEffect(() => {
    setPendingTrainer(isTrainer)
    anim.setValue(isTrainer ? 1 : 0)
  }, [isTrainer, anim])

  if (!currentRole) return null

  const handlePress = (toTrainer: boolean) => {
    if (toTrainer === pendingTrainer) return
    setPendingTrainer(toTrainer)
    Animated.timing(anim, {
      toValue: toTrainer ? 1 : 0,
      duration: SLIDE_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) switchRole()
    })
  }

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
        onPress={() => handlePress(false)}
        hitSlop={4}
        style={{ width: HALF_WIDTH }}
        className="items-center justify-center py-1.5 active:opacity-70"
      >
        <Text className={`font-sans-medium text-[11px] ${pendingTrainer ? 'text-muted' : 'text-coal'}`}>
          {t('roleSwitch.client')}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => handlePress(true)}
        hitSlop={4}
        style={{ width: HALF_WIDTH }}
        className="items-center justify-center py-1.5 active:opacity-70"
      >
        <Text className={`font-sans-medium text-[11px] ${pendingTrainer ? 'text-coal' : 'text-muted'}`}>
          {t('roleSwitch.trainer')}
        </Text>
      </Pressable>
    </View>
  )
}
