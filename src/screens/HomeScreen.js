import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, AppState, Alert, Pressable, ToastAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Button from '../components/Button';
import PickupModal from '../components/PickupModal';
import { COLORS, GPS_CHECK_MS, REFRESH_MS } from '../config';
import { call } from '../api';
import { startDuty, endDuty, ensureTrackingRunning, ensureLocationReady, openAppSettings } from '../location/tracking';

function ago(ms) {
  if (!ms) return '—';
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
const hhmm = (ms) => (ms ? new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '');

export default function HomeScreen({ token, profile, onProfile, onChangeCpc, onLogout }) {
  const [gpsOn, setGpsOn] = useState(true);
  const [bgStatus, setBgStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pickups, setPickups] = useState([]);
  const [showPickup, setShowPickup] = useState(false);
  const [, setTick] = useState(0);
  const reported = useRef(null);
  const onDuty = !!profile.onDuty;

  // Refresh profile (duty + last ping as the server sees it) and today's pickups
  const refresh = useCallback(async () => {
    const [p, pk] = await Promise.all([call('getProfile', token), call('myPickupsToday', token)]);
    if (p.ok) onProfile(p.profile);
    if (pk.ok) setPickups(pk.pickups);
  }, [token, onProfile]);

  useEffect(() => {
    refresh();
    const id = setInterval(() => { refresh(); setTick((t) => t + 1); }, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Keep checking that location is ON
  const checkGps = useCallback(async () => {
    const enabled = await Location.hasServicesEnabledAsync().catch(() => true);
    setGpsOn(enabled);
    const bg = await Location.getBackgroundPermissionsAsync().catch(() => null);
    setBgStatus(bg?.status ?? null);
  }, []);
  useEffect(() => {
    checkGps();
    const id = setInterval(checkGps, GPS_CHECK_MS);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') { checkGps(); refresh(); } });
    return () => { clearInterval(id); sub.remove(); };
  }, [checkGps, refresh]);

  // Tell the hub when GPS goes OFF / ON during duty
  useEffect(() => {
    if (!onDuty || reported.current === gpsOn) return;
    reported.current = gpsOn;
    call('setGps', token, gpsOn);
  }, [gpsOn, onDuty, token]);

  // Duty ON but tracking stopped (phone restart / update) → restart
  useEffect(() => {
    if (onDuty) ensureTrackingRunning().catch(() => {});
  }, [onDuty]);

  const toggleDuty = async () => {
    setBusy(true);
    try {
      if (onDuty) {
        const res = await endDuty(token);
        if (!res.ok) return Alert.alert('Error', res.error);
        onProfile({ ...profile, onDuty: false });
      } else {
        const res = await startDuty(token);
        if (!res.ok) {
          if (res.reason === 'gps_off') Alert.alert('Turn on location', 'Please switch ON location (GPS) to start duty.');
          else if (res.reason === 'denied')
            Alert.alert('Location permission needed', 'Allow location access to start duty.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open settings', onPress: openAppSettings },
            ]);
          else if (res.reason === 'no_fix') Alert.alert('No GPS signal', 'Could not get your location. Move to an open area and try again.');
          else Alert.alert('Error', res.error || 'Please try again.');
          return;
        }
        onProfile({ ...profile, onDuty: true, lastSeen: Date.now() });
        ToastAndroid.show('Duty started — tracking ON', ToastAndroid.SHORT);
        if (!res.bgGranted) {
          Alert.alert(
            'Set location to "Allow all the time"',
            'Settings › Permissions › Location › "Allow all the time". Otherwise tracking stops when the phone is locked.',
            [{ text: 'Later', style: 'cancel' }, { text: 'Open settings', onPress: openAppSettings }]
          );
        }
      }
      checkGps();
    } finally {
      setBusy(false);
    }
  };

  const fixGps = async () => {
    const r = await ensureLocationReady();
    if (!r.ok && r.reason === 'denied') openAppSettings();
    checkGps();
  };

  const logout = () => {
    Alert.alert('Log out?', onDuty ? 'Your duty will be ended and tracking stopped.' : '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          if (onDuty) await endDuty(token).catch(() => {});
          onLogout();
        },
      },
    ]);
  };

  const total = pickups.reduce((s, p) => s + (p.shipments || 0), 0);

  return (
    <SafeAreaView style={styles.wrap} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>SHADOWFAX · RIDER</Text>
          <Text style={styles.name} numberOfLines={1}>{profile.name || 'Rider'}</Text>
          <Text style={styles.meta}>{profile.phone}</Text>
        </View>
        <Pressable onPress={logout} hitSlop={10}><Text style={styles.logout}>Log out</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {onDuty && !gpsOn ? (
          <View style={styles.alert}>
            <Text style={styles.alertTitle}>LOCATION IS OFF</Text>
            <Text style={styles.alertText}>Your hub can't see you. Turn location back on.</Text>
            <Button label="Turn on location" variant="danger" onPress={fixGps} style={{ marginTop: 10, height: 44 }} />
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardLabel}>WORKING FROM</Text>
            {!profile.scope?.fixed ? (
              <Pressable hitSlop={10} onPress={() => (onDuty ? Alert.alert('End duty first', 'You can change your CPC only when off duty.') : onChangeCpc())}>
                <Text style={[styles.changeLink, onDuty && { color: COLORS.grey }]}>Change</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.cpcName}>{profile.cpc}</Text>
          <Text style={styles.cpcMeta}>{profile.city}  ›  {profile.dc}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardLabel}>DUTY STATUS</Text>
            <View style={[styles.pill, { backgroundColor: onDuty ? COLORS.green : COLORS.rule }]}>
              <Text style={[styles.pillText, { color: onDuty ? COLORS.white : COLORS.grey }]}>{onDuty ? 'ON DUTY' : 'OFF DUTY'}</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <Stat label="GPS" value={gpsOn ? 'ON' : 'OFF'} color={gpsOn ? COLORS.green : COLORS.red} />
            <Stat label="LAST SENT" value={onDuty ? ago(profile.lastSeen) : '—'} />
            <Stat label="BACKGROUND" value={bgStatus === 'granted' ? 'Allowed' : 'Not set'} color={bgStatus === 'granted' ? COLORS.green : COLORS.amber} />
          </View>
          <Button label={onDuty ? 'End duty' : 'Start duty'} variant={onDuty ? 'dark' : 'primary'} onPress={toggleDuty} busy={busy} style={{ marginTop: 16 }} />
          {onDuty && bgStatus !== 'granted' ? (
            <Pressable onPress={openAppSettings}><Text style={styles.warnLink}>Set location to "Allow all the time" ›</Text></Pressable>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardLabel}>PICKUPS TODAY</Text>
            <Text style={styles.cardLabel}>{pickups.length} stops · {total.toLocaleString('en-IN')} shipments</Text>
          </View>
          <Button label="+ Pickup check-in" onPress={() => setShowPickup(true)} disabled={!onDuty} style={{ marginTop: 12 }} />
          {!onDuty ? <Text style={styles.hint}>Start duty to check in pickups.</Text> : null}
          {pickups.map((p, i) => (
            <View key={`${p.ts}-${i}`} style={styles.pickupRow}>
              <View style={styles.tri} />
              <View style={{ flex: 1 }}>
                <Text style={styles.pickupClient}>{p.client}</Text>
                <Text style={styles.pickupMeta}>
                  {hhmm(p.ts)}{p.cpc !== profile.cpc ? `  ·  ${p.cpc}` : ''}{p.reference ? `  ·  ${p.reference}` : ''}
                </Text>
              </View>
              <Text style={styles.pickupCount}>{p.shipments}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <PickupModal
        visible={showPickup}
        onClose={() => setShowPickup(false)}
        token={token}
        profile={profile}
        onSaved={(list) => setPickups(list)}
      />
    </SafeAreaView>
  );
}

function Stat({ label, value, color }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color && { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.ink },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18 },
  eyebrow: { color: COLORS.lime, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  name: { color: COLORS.white, fontSize: 22, fontWeight: '800', marginTop: 4 },
  meta: { color: '#c9cdd2', fontSize: 13, marginTop: 2 },
  logout: { color: '#c9cdd2', fontSize: 14, fontWeight: '600', marginTop: 4 },
  card: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 11, fontWeight: '700', color: COLORS.grey, letterSpacing: 1.1 },
  changeLink: { color: COLORS.green, fontWeight: '700', fontSize: 13 },
  cpcName: { fontSize: 20, fontWeight: '800', color: COLORS.darkGreen, marginTop: 8 },
  cpcMeta: { fontSize: 13, color: COLORS.grey, marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  statRow: { flexDirection: 'row', marginTop: 14, gap: 8 },
  stat: { flex: 1, borderWidth: 1, borderColor: COLORS.rule, borderRadius: 10, padding: 10 },
  statLabel: { fontSize: 10, fontWeight: '700', color: COLORS.grey, letterSpacing: 1 },
  statValue: { fontSize: 16, fontWeight: '800', color: COLORS.ink, marginTop: 4 },
  warnLink: { color: COLORS.amber, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  hint: { color: COLORS.grey, fontSize: 13, marginTop: 8, textAlign: 'center' },
  alert: { backgroundColor: COLORS.redTint, borderLeftWidth: 4, borderLeftColor: COLORS.red, borderRadius: 10, padding: 14, marginBottom: 14 },
  alertTitle: { color: COLORS.red, fontWeight: '800', fontSize: 12, letterSpacing: 1.2 },
  alertText: { color: COLORS.ink, marginTop: 4, fontSize: 14 },
  pickupRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.rule },
  tri: { width: 0, height: 0, marginRight: 10, borderTopWidth: 5, borderBottomWidth: 5, borderLeftWidth: 8, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: COLORS.lime },
  pickupClient: { fontSize: 15, fontWeight: '700', color: COLORS.ink },
  pickupMeta: { fontSize: 12, color: COLORS.grey, marginTop: 2 },
  pickupCount: { fontSize: 18, fontWeight: '800', color: COLORS.green },
});
