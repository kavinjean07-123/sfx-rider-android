import { Linking } from 'react-native';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { COLORS, LOCATION_TASK, PING_DISTANCE_M, PING_INTERVAL_MS } from '../config';
import { call } from '../api';

// Location ON + foreground permission. Shows Android's "Turn on location" dialog when off.
export async function ensureLocationReady() {
  let enabled = await Location.hasServicesEnabledAsync();
  if (!enabled) {
    try {
      await Location.enableNetworkProviderAsync();
    } catch (_) {}
    enabled = await Location.hasServicesEnabledAsync();
  }
  if (!enabled) return { ok: false, reason: 'gps_off' };
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return { ok: false, reason: 'denied' };
  return { ok: true };
}

export async function requestBackgroundPermission() {
  try {
    const bg = await Location.requestBackgroundPermissionsAsync();
    return bg.status === 'granted';
  } catch (_) {
    return false;
  }
}

async function startUpdates() {
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (running) return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: PING_INTERVAL_MS,
    distanceInterval: PING_DISTANCE_M,
    deferredUpdatesInterval: PING_INTERVAL_MS,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'Shadowfax Rider · On duty',
      notificationBody: 'Your location is being shared with your hub.',
      notificationColor: COLORS.green,
      killServiceOnDestroy: false,
    },
  });
}

export async function stopUpdates() {
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (running) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}

// Current fix with a timeout, falling back to the last known position.
export async function getCurrentFix(timeoutMs = 15000) {
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
  const fix = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null),
    timeout,
  ]);
  if (fix) return fix;
  return Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 }).catch(() => null);
}

export const toLoc = (fix) => ({
  lat: fix.coords.latitude,
  lng: fix.coords.longitude,
  accuracy: fix.coords.accuracy,
  speed: fix.coords.speed,
});

async function batteryPct() {
  try {
    const l = await Battery.getBatteryLevelAsync();
    return l >= 0 ? Math.round(l * 100) : null;
  } catch (_) {
    return null;
  }
}

export async function startDuty(token) {
  const ready = await ensureLocationReady();
  if (!ready.ok) return ready;
  const bgGranted = await requestBackgroundPermission();
  const fix = await getCurrentFix();
  if (!fix) return { ok: false, reason: 'no_fix' };
  const res = await call('setDuty', token, true, { ...toLoc(fix), battery: await batteryPct() });
  if (!res.ok) return { ok: false, reason: 'server', error: res.error };
  await startUpdates();
  return { ok: true, bgGranted };
}

export async function endDuty(token) {
  await stopUpdates();
  return call('setDuty', token, false, null);
}

// After a phone restart / app update the task may have stopped while duty is still ON.
export async function ensureTrackingRunning() {
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== 'granted') return false;
  await startUpdates();
  return true;
}

export function openAppSettings() {
  return Linking.openSettings();
}
