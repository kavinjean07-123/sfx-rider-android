import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import { COLORS, RESEND_OTP_SECONDS } from '../config';
import { call, normalizePhone } from '../api';

export default function LoginScreen({ onLoggedIn }) {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [testMode, setTestMode] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const send = async () => {
    setError('');
    const p = normalizePhone(phone);
    if (!p) return setError('Enter a valid 10-digit mobile number.');
    setBusy(true);
    const res = await call('sendOtp', p);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setSentTo(res.phone);
    setTestMode(res.mode === 'TEST');
    setCode('');
    setStep('otp');
    setTimer(RESEND_OTP_SECONDS);
  };

  const verify = async (otp = code) => {
    if (otp.length !== 6) return setError('Enter the 6-digit OTP.');
    setError('');
    setBusy(true);
    const res = await call('verifyOtp', sentTo, otp);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onLoggedIn(res.token, res.profile);
  };

  return (
    <SafeAreaView style={styles.wrap} edges={['top', 'bottom']}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>SHADOWFAX · RIDER</Text>
          <Text style={styles.heroTitle}>Pickup Rider Login</Text>
          <View style={styles.underline} />
          <Text style={styles.heroSub}>Log in with your registered mobile number.</Text>
        </View>

        <View style={styles.card}>
          {step === 'phone' ? (
            <>
              <Text style={styles.label}>MOBILE NUMBER</Text>
              <View style={styles.phoneRow}>
                <View style={styles.cc}><Text style={styles.ccText}>+91</Text></View>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                  keyboardType="number-pad"
                  placeholder="10-digit number"
                  placeholderTextColor={COLORS.grey}
                  maxLength={10}
                  autoFocus
                />
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button label="Send OTP" onPress={send} busy={busy} disabled={phone.length !== 10} style={{ marginTop: 18 }} />
            </>
          ) : (
            <>
              <Text style={styles.label}>ENTER OTP</Text>
              <Text style={styles.hint}>Sent to {sentTo}</Text>
              <TextInput
                style={[styles.input, styles.otp]}
                value={code}
                onChangeText={(t) => {
                  const v = t.replace(/\D/g, '').slice(0, 6);
                  setCode(v);
                  if (v.length === 6) verify(v);
                }}
                keyboardType="number-pad"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                placeholder="••••••"
                placeholderTextColor={COLORS.rule}
                maxLength={6}
                autoFocus
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button label="Verify & Login" onPress={() => verify()} busy={busy} disabled={code.length !== 6} style={{ marginTop: 18 }} />
              <View style={styles.otpActions}>
                <Pressable onPress={() => { setStep('phone'); setError(''); }}>
                  <Text style={styles.link}>Change number</Text>
                </Pressable>
                <Pressable onPress={timer > 0 || busy ? undefined : send}>
                  <Text style={[styles.link, timer > 0 && { color: COLORS.grey }]}>
                    {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}
                  </Text>
                </Pressable>
              </View>
              {testMode ? (
                <Text style={styles.testNote}>Test mode: get the OTP from your hub team.</Text>
              ) : null}
            </>
          )}
        </View>
        <Text style={styles.footer}>Your location is shared with your hub only while you are on duty.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.ink },
  hero: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 28 },
  eyebrow: { color: COLORS.lime, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  heroTitle: { color: COLORS.white, fontSize: 28, fontWeight: '800', marginTop: 8 },
  underline: { width: 44, height: 4, backgroundColor: COLORS.lime, borderRadius: 2, marginTop: 10 },
  heroSub: { color: '#c9cdd2', fontSize: 15, marginTop: 14 },
  card: { backgroundColor: COLORS.white, marginHorizontal: 16, borderRadius: 16, padding: 20 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.grey, letterSpacing: 1.2, marginBottom: 8 },
  hint: { fontSize: 14, color: COLORS.ink, marginBottom: 10 },
  phoneRow: { flexDirection: 'row', gap: 10 },
  cc: { height: 54, paddingHorizontal: 14, borderRadius: 12, backgroundColor: COLORS.tint, justifyContent: 'center' },
  ccText: { fontSize: 18, fontWeight: '700', color: COLORS.darkGreen },
  input: { height: 54, borderWidth: 1, borderColor: COLORS.rule, borderRadius: 12, paddingHorizontal: 14, fontSize: 20, color: COLORS.ink, letterSpacing: 1 },
  otp: { textAlign: 'center', fontSize: 28, letterSpacing: 12, fontWeight: '700' },
  error: { color: COLORS.red, marginTop: 10, fontSize: 14 },
  otpActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  link: { color: COLORS.green, fontWeight: '700', fontSize: 14 },
  testNote: { marginTop: 14, backgroundColor: '#fdf6e3', borderLeftWidth: 4, borderLeftColor: COLORS.amber, padding: 10, borderRadius: 8, fontSize: 13, color: COLORS.ink },
  footer: { color: '#9aa0a6', textAlign: 'center', fontSize: 12, marginTop: 20, paddingHorizontal: 30 },
});
