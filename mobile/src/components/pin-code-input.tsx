import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// expo-haptics ships native code — swallow failures so this stays a no-op on a dev
// client that hasn't been rebuilt since it was added, instead of crashing PIN entry.
function safeHaptic(run: () => Promise<void>) {
  run().catch(() => {});
}

type PinCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  hasError?: boolean;
};

export function PinCodeInput({ value, onChange, length = 4, autoFocus, hasError }: PinCodeInputProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (hasError) {
      shakeX.value = withSequence(
        withTiming(-10, { duration: 45 }),
        withTiming(10, { duration: 45 }),
        withTiming(-8, { duration: 45 }),
        withTiming(8, { duration: 45 }),
        withTiming(0, { duration: 45 }),
      );
      safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
    }
  }, [hasError, shakeX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  function handleChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, length);

    if (digits.length > value.length) {
      safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    }

    onChange(digits);
  }

  return (
    <Pressable onPress={() => inputRef.current?.focus()}>
      <Animated.View style={[styles.row, animatedStyle]}>
        {Array.from({ length }).map((_, index) => {
          const filled = index < value.length;
          const isNext = index === value.length;
          const borderColor = hasError ? theme.danger : isNext ? theme.tint : theme.border;

          return (
            <View key={index} style={[styles.box, { borderColor, backgroundColor: theme.backgroundElement }]}>
              {filled && <View style={[styles.dot, { backgroundColor: hasError ? theme.danger : theme.text }]} />}
            </View>
          );
        })}
      </Animated.View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  box: {
    width: 56,
    height: 64,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
});
