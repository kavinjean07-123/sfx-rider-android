import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import { COLORS } from '../config';

export default function MessageScreen({ title, message, actionLabel, onAction, secondaryLabel, onSecondary }) {
  return (
    <SafeAreaView style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.msg}>{message}</Text>
        {actionLabel ? <Button label={actionLabel} onPress={onAction} /> : null}
        {secondaryLabel ? (
          <Button label={secondaryLabel} onPress={onSecondary} variant="ghost" style={{ marginTop: 8 }} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: COLORS.white, borderRadius: 14, padding: 22, borderWidth: 1, borderColor: COLORS.rule },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.ink, marginBottom: 8 },
  msg: { fontSize: 15, color: COLORS.grey, lineHeight: 22, marginBottom: 20 },
});
