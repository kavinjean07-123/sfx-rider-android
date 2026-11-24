import * as TaskManager from 'expo-task-manager';
import * as Battery from 'expo-battery';
import { LOCATION_TASK } from '../config';
import { call, getToken } from '../api';

// Runs whenever Android delivers new locations — also with the screen off
// (the app keeps a foreground service + notification while the rider is on duty).
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  const token = await getToken();
  if (!token) return;

  if (error) {
    // Typically: rider switched location off while on duty.
    await call('setGps', token, false);
    return;
  }

  const locations = data?.locations || [];
  if (!locations.length) return;
  const c = locations[locations.length - 1].coords;

  let battery = null;
  try {
    const level = await Battery.getBatteryLevelAsync();
    if (level >= 0) battery = Math.round(level * 100);
  } catch (_) {}

  await call('ping', token, {
    lat: c.latitude,
    lng: c.longitude,
    accuracy: c.accuracy,
    speed: c.speed,
    battery,
  });
});
