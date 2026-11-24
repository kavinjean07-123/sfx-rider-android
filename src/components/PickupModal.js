import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, ScrollView, Pressable, ToastAndroid } from 'react-native';
import Button from './Button';
import { COLORS } from '../config';
import { call, cpcsOf } from '../api';
import { getCurrentFix, toLoc } from '../location/tracking';

const EMPTY = { client: '', reference: '', shipments: '', note: '' };

export default function PickupModal({ visible, onClose, token, profile, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [cpc, setCpc] = useState(profile.cpc);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const options = profile.scope?.fixed ? [profile.cpc] : cpcsOf(profile.network, profile.city, profile.dc);

  useEffect(() => {
    if (visible) { setForm(EMPTY); setCpc(profile.cpc); setError(''); }
  }, [visible, profile.cpc]);

  const save = async () => {
    if (!form.client.trim()) return setError('Enter the client / seller name.');
    if (!(Number(form.shipments) > 0)) return setError('Enter the number of shipments picked.');
    setError('');
    setBusy(true);
    const fix = await getCurrentFix();
    if (!fix) { setBusy(false); return setError('Could not get your location. Make sure GPS is ON.'); }
    const res = await call('addPickup', token, { ...form, cpc }, toLoc(fix));
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onSaved(res.pickups);
    ToastAndroid.show('Pickup saved ✓', ToastAndroid.SHORT);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Pickup check-in</Text>
            <Text style={styles.sub}>Your current location is saved with this pickup.</Text>

            <Text style={styles.label}>CPC · {profile.dc}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {options.map((c) => (
                <Pressable key={c} onPress={() => setCpc(c)} style={[styles.chip, cpc === c && styles.chipOn]}>
                  <Text style={[styles.chipText, cpc === c && { color: COLORS.white }]}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Field label="CLIENT / SELLER *" value={form.client} onChangeText={set('client')} placeholder="e.g. Meesho seller – Mundka" />
            <Field label="AWB / REFERENCE" value={form.reference} onChangeText={set('reference')} placeholder="Optional" autoCapitalize="characters" />
            <Field label="SHIPMENTS PICKED *" value={form.shipments} onChangeText={(t) => set('shipments')(t.replace(/\D/g, '').slice(0, 5))} placeholder="0" keyboardType="number-pad" />
            <Field label="NOTE" value={form.note} onChangeText={set('note')} placeholder="Optional" multiline />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label="Save check-in" onPress={save} busy={busy} style={{ marginTop: 8 }} />
            <Button label="Cancel" variant="ghost" onPress={onClose} disabled={busy} style={{ marginTop: 8 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, multiline, ...props }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 72, textAlignVertical: 'top', paddingTop: 12 }]}
        placeholderTextColor={COLORS.grey}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(35,31,32,0.55)' },
  sheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, maxHeight: '92%' },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.ink },
  sub: { fontSize: 13, color: COLORS.grey, marginTop: 4, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.grey, letterSpacing: 1.1, marginBottom: 6 },
  input: { height: 48, borderWidth: 1, borderColor: COLORS.rule, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, color: COLORS.ink },
  chip: { borderWidth: 1, borderColor: COLORS.rule, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, backgroundColor: COLORS.white },
  chipOn: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.ink },
  error: { color: COLORS.red, marginBottom: 6, fontSize: 14 },
});
