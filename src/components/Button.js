import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../config';

export default function Button({ label, onPress, busy, disabled, variant = 'primary', style }) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const off = disabled || busy;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border },
        off && { opacity: 0.55 },
        pressed && !off && { opacity: 0.85 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={v.fg} /> : <Text style={[styles.label, { color: v.fg }]}>{label}</Text>}
    </Pressable>
  );
}

const VARIANTS = {
  primary: { bg: COLORS.green, fg: COLORS.white, border: COLORS.green },
  danger: { bg: COLORS.red, fg: COLORS.white, border: COLORS.red },
  dark: { bg: COLORS.ink, fg: COLORS.white, border: COLORS.ink },
  ghost: { bg: 'transparent', fg: COLORS.green, border: COLORS.rule },
};

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  label: { fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
